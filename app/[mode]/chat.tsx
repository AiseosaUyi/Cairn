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
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowUp, Mic, Square, X } from 'lucide-react-native';
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
import { hotlinesFor, crisisExposureAllowed } from '@/safety/crisis';
import { findCharacter, type Character } from '@/companion/characters';

interface Line {
  who: 'companion' | 'you';
  text: string;
  crisis?: string | null;
  /** Optional follow-up suggestions paired with a companion turn. */
  suggestions?: string[];
}

const QUICK_PROMPTS = [
  'Plan a new goal',
  'Adjust my current path',
  'Help me think through something',
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
  onCancel,
  onSend,
}: {
  elapsed: number;
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
        {mm}:{ss}
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
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: space.xs,
        backgroundColor: colors.card,
        borderColor: colors.hairline,
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
  const { mode, preset } = useLocalSearchParams<{ mode: Mode; preset?: string }>();
  const { colors } = useTheme();

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('your companion');
  const [companion, setCompanion] = useState<Character | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const userName = useRef<string | null>(null);
  const region = useRef<'NG' | 'US' | 'unknown'>('unknown');
  const started = useRef(false);

  const say = useCallback(
    async (userText: string) => {
      setBusy(true);
      setLines((l) => [...l, { who: 'you', text: userText }]);
      const res = await runTurn(mode, userText, userName.current);
      setLines((l) => [
        ...l,
        {
          who: 'companion',
          text: res.reply,
          crisis: res.crisisInline,
          suggestions: FOLLOWUPS,
        },
      ]);
      setBusy(false);
    },
    [mode],
  );

  // Initial profile + companion load. Also handles `?preset=clarity` from
  // Today's "talk it through first" link by firing the opening turn once.
  useEffect(() => {
    (async () => {
      await setProfile({ lastMode: mode });
      const p = await getProfile();
      userName.current = p.name;
      region.current = p.region;
      setCoachName(resolveCoachName(p, mode));
      setDisplayName(coachLabel(p, mode));
      setCompanion(findCharacter(p.companionId));
      if (preset === 'clarity' && !started.current) {
        started.current = true;
        say(CLARITY_PRESET);
      }
    })();
  }, [mode, preset, say]);

  // Recording timer (visual stub).
  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Real impl: stop recording, send audio → Whisper, populate input.
  // For now: stub a transcript so the UX flow is testable end-to-end.
  function finishRecording(commit: boolean) {
    setRecording(false);
    if (!commit) return;
    const stub = "[Voice note · transcription wiring pending — Whisper API]";
    setInput((cur) => (cur ? `${cur} ${stub}` : stub));
  }

  const headerName = companion?.name ?? coachName ?? 'Your companion';
  const headerSub = companion?.role
    ? `${companion.role} · ask anything`
    : 'Ask anything · plan, adjust, think';

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
                  {QUICK_PROMPTS.map((p) => (
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
                  {ln.suggestions && i === lines.length - 1 && !busy && (
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
          {recording ? (
            <RecordingOverlay
              elapsed={elapsed}
              onCancel={() => finishRecording(false)}
              onSend={() => finishRecording(true)}
            />
          ) : (
            <Composer
              value={input}
              onChange={setInput}
              busy={busy}
              placeholder="Talk to me"
              onStartRecord={() => setRecording(true)}
              onSend={() => {
                const t = input.trim();
                if (!t) return;
                setInput('');
                say(t);
              }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
