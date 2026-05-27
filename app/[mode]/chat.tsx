/**
 * Chat tab — opt-in conversation with the user's AI companion.
 *
 * Premium AI-chat composer pattern (ChatGPT / Claude / Perplexity-grade):
 *   - Single rounded composer pill, auto-grow textarea
 *   - Mic + send buttons inline at the right edge of the input
 *   - Voice-note recording overlay (visual stub here — real recording
 *     wires expo-av; transcribe wires Whisper. Both flagged in the body.)
 *   - Companion-aware header: chosen character's avatar + name
 *   - Typing indicator with animated dots
 *   - Suggested follow-up chips after each companion reply
 *
 * Crisis handling is preserved: an inline CrisisInline still renders if
 * runTurn returns one, with motion frozen for that subtree.
 *
 * `?preset=clarity` (linked from Today's empty state) auto-fires a
 * "help me figure out what I want" turn so the user lands inside the
 * conversation already underway.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowUp, Compass, Mic, Square, Target, X } from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space, type Mode } from '@/design/tokens';
import {
  CompanionBubble,
  CrisisInline,
  Mascot,
  Rise,
} from '@/components/ui';
import { coachLabel, getProfile, resolveCoachName, setProfile } from '@/profile';
import { runTurn } from '@/companion/turn';
import {
  acceptProposal,
  applyPathUpdate,
  findTask,
  getActiveGoal,
  type Goal,
  type GoalProposal,
  type PathUpdate,
} from '@/companion/goals';
import { hotlinesFor, crisisExposureAllowed } from '@/safety/crisis';
import { findCharacter, type Character } from '@/companion/characters';
import { useVoiceRecorder } from '@/llm/useVoiceRecorder';

interface Line {
  who: 'companion' | 'you';
  text: string;
  crisis?: string | null;
  /** Optional follow-up suggestions paired with a companion turn. */
  suggestions?: string[];
  /** Agent-emitted goal-shape proposal. Renders as an inline "Lock it
   *  in" chip below the message. */
  proposal?: GoalProposal | null;
  /** Agent-emitted fine-grained path edits (add/complete/skip/etc).
   *  Renders as an inline "Update path" chip below the message. */
  pathUpdate?: PathUpdate | null;
  /** Once the user accepts / dismisses, the chip disappears. */
  proposalResolved?: 'accepted' | 'dismissed';
  pathUpdateResolved?: 'accepted' | 'dismissed';
}

const QUICK_PROMPTS_DEFAULT = [
  'Plan a new goal',
  'Adjust my current path',
  'Help me think through something',
];

/** Goal-aware quick prompts when the user has an active goal. */
const QUICK_PROMPTS_WITH_GOAL = [
  'Add a task to my current phase',
  'Reshuffle what comes next',
  'Mark something as done',
  'I want to slow down / speed up',
];

const FOLLOWUPS = [
  'Tell me more',
  "What's the smallest next step?",
  'Push back on that',
];

const CLARITY_PRESET =
  "I'm not sure what I want next. Help me figure it out — ask me what you need to.";

// ---------------------------------------------------------------------------
// Typing indicator — three dots that fade-pulse in sequence
// ---------------------------------------------------------------------------
function TypingDots({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }}>
      {[0, 1, 2].map((i) => (
        <MotiView
          key={i}
          from={{ opacity: 0.25, translateY: 0 }}
          animate={{ opacity: 1, translateY: -2 }}
          transition={{
            type: 'timing',
            duration: 500,
            delay: i * 120,
            easing: Easing.inOut(Easing.quad),
            loop: true,
            repeatReverse: true,
          }}
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Voice-record overlay (stub UI). When real recording lands:
//   - expo-av Audio.Recording for capture
//   - POST to backend → Whisper for transcription
//   - On stop: replace `transcribing…` with transcript, populate composer
// ---------------------------------------------------------------------------
function RecordingOverlay({
  elapsed,
  transcribing = false,
  onCancel,
  onSend,
}: {
  elapsed: number;
  transcribing?: boolean;
  onCancel: () => void;
  onSend: () => void;
}) {
  const { colors } = useTheme();
  const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const ss = (elapsed % 60).toString().padStart(2, '0');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: colors.card,
        borderColor: colors.hairline,
        borderWidth: 1,
        borderRadius: layout.radius.full,
        paddingHorizontal: space.xs,
        paddingVertical: space.xs,
        minHeight: 54,
      }}
    >
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel recording"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={18} color={colors.ink} strokeWidth={1.75} />
      </Pressable>

      <MotiView
        from={{ opacity: 0.35, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1.1 }}
        transition={{
          type: 'timing',
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          loop: true,
          repeatReverse: true,
        }}
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#D9694E',
        }}
      />

      <Text variant="caption" style={{ minWidth: 42, fontWeight: '600' }}>
        {transcribing ? 'Transcribing…' : `${mm}:${ss}`}
      </Text>

      {/* Fake waveform — RN can't render real waveform without expo-av. */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 }}>
        {Array.from({ length: 18 }).map((_, i) => {
          const seed = (i * 13 + elapsed * 7) % 9;
          const h = 4 + seed * 2.2;
          return (
            <MotiView
              key={i}
              animate={{ height: h }}
              transition={{ type: 'timing', duration: 220, easing: Easing.inOut(Easing.quad) }}
              style={{ width: 2.5, borderRadius: 1.5, backgroundColor: colors.ink, opacity: 0.55 }}
            />
          );
        })}
      </View>

      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel="Send voice note"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ArrowUp size={18} color="#FFFFFF" strokeWidth={2.25} />
      </Pressable>
    </View>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ---------------------------------------------------------------------------
// PathUpdateCard — the inline chip the agent emits when it has
// concrete add/skip/reschedule operations to apply to the active path.
// ---------------------------------------------------------------------------
function PathUpdateCard({
  update,
  onAccept,
  onDismiss,
}: {
  update: PathUpdate;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const opCount = update.operations.length;
  const summary =
    opCount === 1
      ? '1 change'
      : `${opCount} changes`;
  return (
    <Rise delay={120}>
      <View
        style={{
          marginTop: 4,
          padding: space.md,
          borderRadius: layout.radius.card,
          backgroundColor: colors.card,
          borderColor: colors.accent,
          borderWidth: 1,
          gap: space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Compass size={12} color={colors.accent} strokeWidth={2.25} />
          <Text
            variant="caption"
            color={colors.accent}
            style={{ letterSpacing: 0.6, fontWeight: '700', fontSize: 11 }}
          >
            UPDATE YOUR PATH · {summary.toUpperCase()}
          </Text>
        </View>
        <Text variant="body" style={{ lineHeight: 22 }}>
          {update.rationale}
        </Text>
        <View style={{ gap: 4 }}>
          {update.operations.slice(0, 4).map((op, i) => (
            <Text key={i} variant="caption" soft style={{ fontSize: 12 }}>
              · {opLabel(op)}
            </Text>
          ))}
          {update.operations.length > 4 && (
            <Text variant="caption" soft style={{ fontSize: 12 }}>
              · …and {update.operations.length - 4} more
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xs }}>
          <Pressable
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel="Apply changes"
            style={{
              flex: 1,
              backgroundColor: colors.accent,
              borderRadius: layout.radius.full,
              paddingVertical: space.sm,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
            }}
          >
            <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '700', fontSize: 13 }}>
              Apply changes
            </Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            style={{
              backgroundColor: colors.canvas,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: layout.radius.full,
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
            }}
          >
            <Text variant="caption" style={{ fontWeight: '600', fontSize: 13 }}>
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </Rise>
  );
}

function opLabel(op: PathUpdate['operations'][number]): string {
  switch (op.kind) {
    case 'add-task':
      return `Add: ${op.title}`;
    case 'complete-task':
      return 'Mark a task done';
    case 'skip-task':
      return 'Skip a task';
    case 'remove-task':
      return 'Remove a task';
    case 'reschedule-task':
      return `Reschedule to ${op.dueOn}`;
    case 'rename-phase':
      return `Rename phase to "${op.title}"`;
    case 'reorder-tasks':
      return 'Reorder this phase';
  }
}

// ---------------------------------------------------------------------------
// GoalProposalCard — when the agent emits a goal-proposal block, this
// renders inline below the message: a small chip-card with the
// agent-proposed title + CTA. The CTA copy adapts to framing
// (Lock it in / Update my goal / Replace my goal).
// ---------------------------------------------------------------------------
function GoalProposalCard({
  proposal,
  onAccept,
  onDismiss,
}: {
  proposal: GoalProposal;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const ctaLabel =
    proposal.framing === 'update' ? 'Update my goal'
    : proposal.framing === 'replace' ? 'Replace my goal'
    : 'Lock it in';
  const eyebrow =
    proposal.framing === 'update' ? 'REFINE YOUR ACTIVE GOAL'
    : proposal.framing === 'replace' ? 'CHANGE DIRECTION'
    : 'READY TO COMMIT?';
  return (
    <Rise delay={120}>
      <View
        style={{
          marginTop: 4,
          padding: space.md,
          borderRadius: layout.radius.card,
          backgroundColor: colors.ink,
          gap: space.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {proposal.framing === 'update' ? (
            <Compass size={12} color={colors.accent} strokeWidth={2.25} />
          ) : (
            <Target size={12} color={colors.accent} strokeWidth={2.25} />
          )}
          <Text
            variant="caption"
            color={colors.accent}
            style={{ letterSpacing: 0.6, fontWeight: '700', fontSize: 11 }}
          >
            {eyebrow}
          </Text>
        </View>
        <Text
          color="#FFFFFF"
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 20,
            lineHeight: 24,
            letterSpacing: -0.2,
          }}
        >
          {proposal.title}
        </Text>
        <Text variant="caption" color="rgba(255,255,255,0.6)" style={{ fontSize: 12 }}>
          Horizon: {proposal.horizon}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xs }}>
          <Pressable
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={{
              flex: 1,
              backgroundColor: colors.accent,
              borderRadius: layout.radius.full,
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
            }}
          >
            <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '700', fontSize: 13 }}>
              {ctaLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Not yet"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: layout.radius.full,
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 40,
            }}
          >
            <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ fontWeight: '600', fontSize: 13 }}>
              Not yet
            </Text>
          </Pressable>
        </View>
      </View>
    </Rise>
  );
}

// ---------------------------------------------------------------------------
// Composer — auto-grow textarea, inline mic + send buttons
// ---------------------------------------------------------------------------
function Composer({
  value,
  onChange,
  onSend,
  onStartRecord,
  busy,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  onSend: () => void;
  onStartRecord: () => void;
  busy: boolean;
  placeholder: string;
}) {
  const { colors } = useTheme();
  const hasText = value.trim().length > 0;
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: space.xs,
        backgroundColor: colors.card,
        // Drop the hairline when the composer is focused — the surface
        // already lifts on shadow, and the extra border felt boxed-in.
        borderColor: focused ? 'transparent' : colors.hairline,
        borderWidth: 1,
        borderRadius: 24,
        paddingHorizontal: space.sm,
        paddingTop: space.xs,
        paddingBottom: space.xs,
        ...shadow.rest,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        accessibilityLabel="Message your companion"
        multiline
        style={{
          flex: 1,
          minHeight: 40,
          maxHeight: 140,
          color: colors.ink,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          lineHeight: 22,
          paddingHorizontal: space.sm,
          paddingTop: 10,
          paddingBottom: 8,
          // @ts-expect-error web-only outline reset
          outlineWidth: 0,
        }}
      />
      {/* Mic — hidden when there's text (industry-standard composer rule:
          show send when typing, voice when empty) */}
      {!hasText && (
        <Pressable
          onPress={onStartRecord}
          accessibilityRole="button"
          accessibilityLabel="Record a voice note"
          disabled={busy}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.canvas,
            borderColor: colors.hairline,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic size={18} color={colors.ink} strokeWidth={1.75} />
        </Pressable>
      )}
      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={!hasText || busy}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: hasText ? colors.ink : colors.hairline,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hasText ? 1 : 0.6,
        }}
      >
        <ArrowUp
          size={18}
          color={hasText ? '#FFFFFF' : colors.inkSoft}
          strokeWidth={2.25}
        />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function Chat() {
  const { mode, preset, taskId } = useLocalSearchParams<{ mode: Mode; preset?: string; taskId?: string }>();
  const { colors } = useTheme();

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('your companion');
  const [companion, setCompanion] = useState<Character | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const voice = useVoiceRecorder();
  const userName = useRef<string | null>(null);
  const region = useRef<'NG' | 'US' | 'unknown'>('unknown');
  const started = useRef(false);

  const say = useCallback(
    async (userText: string) => {
      setBusy(true);
      const history = lines.map((l) => ({
        role: l.who === 'companion' ? ('companion' as const) : ('user' as const),
        text: l.text,
      }));
      setLines((l) => [...l, { who: 'you', text: userText }]);
      const res = await runTurn(mode, userText, userName.current, history);
      setLines((l) => [
        ...l,
        {
          who: 'companion',
          text: res.reply,
          crisis: res.crisisInline,
          suggestions: FOLLOWUPS,
          proposal: res.proposal,
          pathUpdate: res.pathUpdate,
        },
      ]);
      setBusy(false);
    },
    [mode, lines],
  );

  // User accepts the agent-suggested goal lock-in. Calls the right
  // create/update/replace path under the hood, marks the chip resolved,
  // and navigates to /career so they see their new (or updated) path.
  const router = useRouter();
  const onAcceptProposal = useCallback(
    async (lineIdx: number, proposal: GoalProposal) => {
      await acceptProposal(proposal);
      setLines((cur) =>
        cur.map((ln, i) =>
          i === lineIdx ? { ...ln, proposalResolved: 'accepted' } : ln,
        ),
      );
      router.navigate('/career' as any);
    },
    [router],
  );

  const onDismissProposal = useCallback((lineIdx: number) => {
    setLines((cur) =>
      cur.map((ln, i) =>
        i === lineIdx ? { ...ln, proposalResolved: 'dismissed' } : ln,
      ),
    );
  }, []);

  const onAcceptPathUpdate = useCallback(
    async (lineIdx: number, update: PathUpdate) => {
      const updated = await applyPathUpdate(update);
      setLines((cur) =>
        cur.map((ln, i) =>
          i === lineIdx ? { ...ln, pathUpdateResolved: 'accepted' } : ln,
        ),
      );
      if (updated) setActiveGoal(updated);
      router.navigate('/career' as any);
    },
    [router],
  );

  const onDismissPathUpdate = useCallback((lineIdx: number) => {
    setLines((cur) =>
      cur.map((ln, i) =>
        i === lineIdx ? { ...ln, pathUpdateResolved: 'dismissed' } : ln,
      ),
    );
  }, []);

  // Initial profile + companion + goal load. Presets:
  //   clarity      — Today's "talk it through" → fires the clarity opener
  //                  (auto-sends a user-shaped message so the model
  //                  responds with the clarity-coaching flow)
  //   adjust-path  — Today's "Add a task" → AGENT-INITIATED greeting.
  //                  No fake user message — the companion sends the
  //                  first line ("Want to add a task or talk something
  //                  through?") and the user takes it from there.
  //                  The agent already has the goal + tasks in its
  //                  system prompt for subsequent turns.
  useEffect(() => {
    (async () => {
      await setProfile({ lastMode: mode });
      const p = await getProfile();
      userName.current = p.name;
      region.current = p.region;
      setCoachName(resolveCoachName(p, mode));
      setDisplayName(coachLabel(p, mode));
      setCompanion(findCharacter(p.companionId));
      const g = await getActiveGoal();
      setActiveGoal(g);
      if (!started.current) {
        if (taskId) {
          started.current = true;
          // Task-scoped chat: open with a companion greeting that names
          // the task. The agent already gets goal context via the
          // playbook; the task title in the greeting is enough to anchor
          // the conversation. Real per-task system-prompt injection is a
          // follow-up if this surface gets heavy use.
          const found = await findTask(taskId);
          if (found) {
            const greeting = found.task.why
              ? `Let's work on "${found.task.title}". ${found.task.why} What's your first cut?`
              : `Let's work on "${found.task.title}". What's your first cut?`;
            setLines([
              {
                who: 'companion',
                text: greeting,
                suggestions: [
                  "I don't know where to start",
                  "Show me what good looks like",
                  "I have a rough draft — react to it",
                  "What questions should I be asking myself?",
                ],
              },
            ]);
          } else {
            setLines([
              {
                who: 'companion',
                text: `That task wasn't found — it may have been removed. Want to talk through something else?`,
              },
            ]);
          }
        } else if (preset === 'clarity') {
          started.current = true;
          say(CLARITY_PRESET);
        } else if (preset === 'adjust-path') {
          started.current = true;
          // Build a contextual agent-side greeting locally — no LLM call,
          // no fake user message. Subsequent turns hit the LLM normally
          // with goal + task context in the system prompt.
          let greeting: string;
          let suggestions: string[];
          if (g) {
            const phaseIdx = g.phases.findIndex((ph) => ph.status === 'in_progress');
            const phase = phaseIdx >= 0 ? g.phases[phaseIdx] : g.phases[0];
            const phaseNum = phaseIdx >= 0 ? phaseIdx + 1 : 1;
            greeting = phase
              ? `We're on Phase ${phaseNum}: ${phase.title}. What do you want to add as a task, or what's on your mind?`
              : `What do you want to add for "${g.title}", or what's on your mind?`;
            suggestions = [
              'Add a task',
              'Mark something done',
              'Reshuffle what comes next',
              'Just want to think out loud',
            ];
          } else {
            greeting = 'What do you want to add or talk through?';
            suggestions = [
              'Plan a new goal',
              'Help me think something through',
            ];
          }
          setLines([{ who: 'companion', text: greeting, suggestions }]);
        }
      }
    })();
  }, [mode, preset, taskId, say]);

  // Real recording — useVoiceRecorder() handles MediaRecorder + Whisper.
  // On stop+send: transcript drops straight into the conversation as a
  // user message (auto-send), so the voice flow is one tap → reply, not
  // tap → transcribe → tap-again-to-send.
  async function finishRecording(commit: boolean) {
    if (!commit) {
      voice.cancel();
      return;
    }
    const text = await voice.stopAndTranscribe();
    if (text && text.trim()) {
      say(text.trim());
    }
  }

  const headerName = companion?.name ?? coachName ?? 'Your companion';
  // When a goal is active, the subtitle reminds the user which goal
  // they're working on — every chat turn is implicitly in service of it.
  const headerSub = activeGoal
    ? `Working on: ${truncate(activeGoal.title, 56)}`
    : companion?.role
    ? `${companion.role} · ask anything`
    : 'Ask anything · plan, adjust, think';
  // Goal-aware quick prompts.
  const quickPrompts = activeGoal ? QUICK_PROMPTS_WITH_GOAL : QUICK_PROMPTS_DEFAULT;

  // Chat uses a custom layout (not <Screen>) so the composer can pin
  // close to the floating tab bar while messages scroll above. Keeps
  // chat content's vertical real estate maximum.
  // Tab bar pill height (~48) + bottom offset (16) = 64; composer sits
  // 6px above that for breathing room.
  const COMPOSER_BOTTOM_GAP = 70;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
          paddingTop: space.lg,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'center',
            paddingHorizontal: space.lg,
            paddingBottom: space.md,
          }}
        >
          <Mascot name={coachName} character={companion} size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="h3" style={{ fontSize: 20 }}>
              {headerName}
            </Text>
            <Text variant="caption" soft>
              {headerSub}
            </Text>
          </View>
        </View>

        {/* Scrollable message area — flex:1 so it absorbs all vertical
            space between header and composer. */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: space.md, paddingHorizontal: space.lg, gap: space.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Empty state → quick prompts */}
          {lines.length === 0 && (
            <Rise delay={60}>
              <View style={{ gap: space.sm }}>
                <Text
                  variant="caption"
                  soft
                  style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}
                >
                  QUICK PROMPTS
                </Text>
                <View style={{ gap: space.xs }}>
                  {quickPrompts.map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => say(p)}
                      accessibilityRole="button"
                      accessibilityLabel={p}
                      style={{
                        paddingHorizontal: space.md,
                        paddingVertical: space.sm,
                        borderRadius: layout.radius.control,
                        backgroundColor: colors.card,
                        borderColor: colors.hairline,
                        borderWidth: 1,
                        minHeight: 48,
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="body" style={{ fontWeight: '500' }}>
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Rise>
          )}

          {/* Conversation */}
          {lines.map((ln, i) => {
            const inCrisis = ln.who === 'companion' && ln.crisis != null;
            if (ln.who === 'companion') {
              return (
                <View key={i} style={{ gap: space.sm }}>
                  <CompanionBubble name={coachName} character={companion} frozen={inCrisis}>
                    {ln.text}
                  </CompanionBubble>
                  {ln.crisis != null && (
                    <CrisisInline
                      message={crisisExposureAllowed() ? (ln.crisis as string) : ''}
                      preReview={!crisisExposureAllowed()}
                      hotlines={hotlinesFor(region.current)}
                    />
                  )}
                  {ln.proposal && !ln.proposalResolved && (
                    <GoalProposalCard
                      proposal={ln.proposal}
                      onAccept={() => onAcceptProposal(i, ln.proposal!)}
                      onDismiss={() => onDismissProposal(i)}
                    />
                  )}
                  {ln.pathUpdate && !ln.pathUpdateResolved && (
                    <PathUpdateCard
                      update={ln.pathUpdate}
                      onAccept={() => onAcceptPathUpdate(i, ln.pathUpdate!)}
                      onDismiss={() => onDismissPathUpdate(i)}
                    />
                  )}
                  {ln.suggestions && i === lines.length - 1 && !busy && !ln.proposal && (
                    <Rise delay={120}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                        {ln.suggestions.map((s) => (
                          <Pressable
                            key={s}
                            onPress={() => say(s)}
                            accessibilityRole="button"
                            style={{
                              paddingHorizontal: space.md,
                              paddingVertical: 8,
                              borderRadius: layout.radius.full,
                              backgroundColor: colors.card,
                              borderColor: colors.hairline,
                              borderWidth: 1,
                            }}
                          >
                            <Text
                              variant="caption"
                              style={{ fontWeight: '500', fontSize: 13 }}
                            >
                              {s}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </Rise>
                  )}
                </View>
              );
            }
            return (
              <Rise key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      maxWidth: '85%',
                      backgroundColor: colors.ink,
                      borderRadius: layout.radius.card,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.md,
                    }}
                  >
                    <Text variant="body" color="#FFFFFF" style={{ lineHeight: 22 }}>
                      {ln.text}
                    </Text>
                  </View>
                </View>
              </Rise>
            );
          })}
          {busy && (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Mascot name={coachName} character={companion} size={28} />
              <View
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  borderRadius: layout.radius.card,
                  paddingHorizontal: space.sm,
                  paddingVertical: 4,
                }}
              >
                <TypingDots color={colors.inkSoft} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Composer pinned just above the tab bar. Width matches the
            floating tab bar pill (92% / max maxContentWidth - space.lg)
            for visual alignment. */}
        <View
          style={{
            width: '92%',
            maxWidth: layout.maxContentWidth - space.lg,
            alignSelf: 'center',
            paddingBottom: COMPOSER_BOTTOM_GAP,
            paddingTop: space.xs,
          }}
        >
          {voice.recording || voice.transcribing ? (
            <RecordingOverlay
              elapsed={voice.elapsed}
              transcribing={voice.transcribing}
              onCancel={() => finishRecording(false)}
              onSend={() => finishRecording(true)}
            />
          ) : (
            <Composer
              value={input}
              onChange={setInput}
              busy={busy}
              placeholder="Talk to me"
              onStartRecord={voice.start}
              onSend={() => {
                const t = input.trim();
                if (!t) return;
                setInput('');
                say(t);
              }}
            />
          )}
          {voice.error && (
            <Text variant="caption" color={colors.error} style={{ marginTop: 6, fontSize: 12 }}>
              {voice.error}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
