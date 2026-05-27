/**
 * LLM provider abstraction. The single seam so a model outage is one
 * swap, not a rewrite. Default = mock (zero credentials, the whole
 * loop runs).
 *
 * Provider model after the 2026-05-27 security fix:
 *   - OpenAIProvider posts to OUR server route (/api/chat). The
 *     real OpenAI key lives ONLY in process.env.OPENAI_API_KEY on
 *     the server (Vercel Function). The client never sees it.
 *   - MockProvider is unchanged — deterministic offline replies, no
 *     network, no key.
 *
 * Native note: relative URLs work on web. When native binaries ship
 * later, set EXPO_PUBLIC_API_BASE_URL so the native client knows
 * which absolute URL to hit (e.g. https://cairn.app/api/chat).
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  text: string;
  /** Provider-reported stop reason; "refusal" routes to the safe path. */
  stop: 'ok' | 'refusal' | 'length' | 'error';
}

export interface LlmProvider {
  name: string;
  complete(messages: LlmMessage[]): Promise<LlmResult>;
}

/** Resolve the API base URL — relative on web, env-driven on native. */
function apiBase(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
}

// ---------------------------------------------------------------------------
// Mock provider — deterministic, offline, useful for tests + key-less dev.
// ---------------------------------------------------------------------------
class MockProvider implements LlmProvider {
  name = 'mock';
  async complete(messages: LlmMessage[]): Promise<LlmResult> {
    const sys = messages.find((m) => m.role === 'system')?.content ?? '';
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const yesterday = /Yesterday you said you'd (.+?)\./i.exec(sys)?.[1];
    const name = /Their name is ([^.]+)\./.exec(sys)?.[1]?.trim();

    const open = name ? `${name}, ` : '';
    if (/^\s*(check[- ]?in|good morning|start)/i.test(lastUser) || lastUser === '__RITUAL__') {
      const followup = yesterday
        ? `Yesterday you said you'd ${yesterday}. Did you?`
        : `How did today actually go — not the polite version?`;
      return {
        stop: 'ok',
        text:
          `${open}I'm here. ${followup} ` +
          `Tell me straight and we'll figure out the next move together.`,
      };
    }
    return {
      stop: 'ok',
      text:
        `[mock companion] I hear you: "${lastUser.slice(0, 140)}". ` +
        `When a real model key is set this becomes a genuine, remembered reply. ` +
        `What's the one thing that would make tomorrow lighter?`,
    };
  }
}

// ---------------------------------------------------------------------------
// OpenAI provider — calls OUR /api/chat proxy. Key stays server-side.
// ---------------------------------------------------------------------------
class OpenAIProvider implements LlmProvider {
  name: string;
  constructor(private model: string) {
    this.name = `openai:${model}`;
  }

  async complete(messages: LlmMessage[]): Promise<LlmResult> {
    try {
      const res = await fetch(`${apiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: this.model }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        return {
          stop: 'error',
          text: err?.error ?? `HTTP ${res.status}`,
        };
      }

      const json = (await res.json()) as { text?: string; stop?: string };
      const finish = json.stop ?? 'stop';
      const stop: LlmResult['stop'] =
        finish === 'stop' ? 'ok'
        : finish === 'length' ? 'length'
        : finish === 'content_filter' ? 'refusal'
        : 'error';
      return { stop, text: json.text ?? '' };
    } catch (e) {
      return {
        stop: 'error',
        text: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Anthropic provider — stub. Implement when needed (same proxy pattern;
// add /api/chat?provider=anthropic or a separate route).
// ---------------------------------------------------------------------------
class AnthropicProvider implements LlmProvider {
  name = 'anthropic';
  constructor(private _model: string) {}
  async complete(_messages: LlmMessage[]): Promise<LlmResult> {
    return {
      stop: 'error',
      text:
        'Anthropic provider not implemented yet. Set EXPO_PUBLIC_LLM_PROVIDER=openai ' +
        'or =mock for now.',
    };
  }
}

// ---------------------------------------------------------------------------
// Factory + lazy singleton.
//
// EXPO_PUBLIC_LLM_API_KEY is no longer read — the key is server-side.
// EXPO_PUBLIC_LLM_MODEL still picks which OpenAI model the proxy uses.
// ---------------------------------------------------------------------------
let provider: LlmProvider | null = null;

export function getProvider(): LlmProvider {
  if (provider) return provider;
  const choice = (process.env.EXPO_PUBLIC_LLM_PROVIDER ?? 'mock').toLowerCase();
  const model = process.env.EXPO_PUBLIC_LLM_MODEL ?? 'gpt-4.1-mini';

  if (choice === 'openai') {
    provider = new OpenAIProvider(model);
  } else if (choice === 'anthropic') {
    provider = new AnthropicProvider(model);
  } else {
    provider = new MockProvider();
  }
  return provider;
}

export function setProvider(p: LlmProvider) {
  provider = p;
}

/** Test/dev helper: reset the cached provider so the next getProvider() call
 *  re-reads env vars. Useful after env changes during HMR. */
export function resetProvider() {
  provider = null;
}
