/**
 * LLM provider abstraction. The single seam so a model outage is one swap,
 * not a rewrite. Default = mock (zero credentials, the whole loop runs today).
 *
 * LLM single-point-of-failure was an accepted risk for the tiny alpha
 * (eng-review); the interface is the cheap seam that lets fallback land later.
 */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  text: string;
  /** Provider-reported stop reason; "refusal" must route to the safe path. */
  stop: 'ok' | 'refusal' | 'length' | 'error';
}

export interface LlmProvider {
  name: string;
  complete(messages: LlmMessage[]): Promise<LlmResult>;
}

/**
 * Mock provider. Deterministic, offline, shaped like the real companion:
 * it reflects the injected memory back so the ritual + recall are visible
 * without an API key. Not intelligent — honest scaffolding.
 */
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

/** Real adapters — guarded stubs. They throw clearly; caller falls back to mock. */
class HttpProvider implements LlmProvider {
  constructor(public name: string) {}
  async complete(): Promise<LlmResult> {
    throw new Error(
      `${this.name} adapter needs EXPO_PUBLIC_LLM_API_KEY. Wire the real ` +
        `HTTP call here (with prompt caching for the system block). Until then ` +
        `the mock keeps the loop runnable.`,
    );
  }
}

let provider: LlmProvider | null = null;

export function getProvider(): LlmProvider {
  if (provider) return provider;
  const choice = process.env.EXPO_PUBLIC_LLM_PROVIDER ?? 'mock';
  const key = process.env.EXPO_PUBLIC_LLM_API_KEY;
  if ((choice === 'anthropic' || choice === 'openai') && key) {
    provider = new HttpProvider(choice);
  } else {
    provider = new MockProvider();
  }
  return provider;
}

export function setProvider(p: LlmProvider) {
  provider = p;
}
