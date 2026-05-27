/**
 * Goal setup walkthrough — the dynamic first-time experience.
 *
 * v2 (2026-05-26): broadened scope and richer context capture.
 *
 *   STEP 1 — Goal type
 *     Free-text goal input is the PRIMARY affordance (write any goal, in
 *     your own words). Templates are inspiration only, grouped into
 *     three intents:
 *       • Make a move (land a role, promo, negotiate, switch)
 *       • Level up where I am (honest feedback, areas to improve,
 *         where to focus, future-proof skills)
 *       • Custom (always available)
 *
 *   STEP 2 — Tell me more (the missing data the agent needs to give
 *     real analysis, not fluff)
 *       • Goal in your own words (editable)
 *       • Current role + how long in it
 *       • What's been working
 *       • What hasn't
 *       • Constraints (time, location, family, etc.)
 *       • Horizon
 *
 *   STEP 3 — Building (animation → createGoal → /career)
 *
 * The richer context is concatenated into Goal.context, which the real
 * agent backend will consume as part of the system prompt to produce
 * specific, manager-grade analysis rather than generic career advice.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  MessageCircle,
  PenLine,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { Card, Rise, Screen } from '@/components/ui';
import { createGoal, type GoalIntent } from '@/companion/goals';
import { getProfile, setProfile } from '@/profile';

type Step = 'choose' | 'context' | 'thinking';

interface Template {
  id: GoalIntent;
  label: string;
  /** Prefilled goal text the user can edit on step 2. */
  prefill: string;
}

interface TemplateGroup {
  title: string;
  icon: LucideIcon;
  items: Template[];
}

const GROUPS: TemplateGroup[] = [
  {
    title: 'Make a move',
    icon: Briefcase,
    items: [
      { id: 'land-senior', label: 'Land a senior role', prefill: 'Land a senior role at a strong company within 12 weeks.' },
      { id: 'get-promo', label: 'Get promoted at my current job', prefill: 'Make the case for promotion to the next level in my current role.' },
      { id: 'negotiate', label: 'Negotiate a better offer or raise', prefill: 'Negotiate a stronger comp package on my next offer (or current raise cycle).' },
      { id: 'switch', label: 'Switch industries or function', prefill: 'Move from my current function into a new one without taking a pay cut.' },
      { id: 'first-job', label: 'Land my first job in this field', prefill: 'Land a first role in this field without prior on-paper experience.' },
      { id: 'founder', label: 'Make the leap into founding something', prefill: 'Move from operator to first-time founder over the next year.' },
    ],
  },
  {
    title: 'Level up where I am',
    icon: TrendingUp,
    items: [
      {
        id: 'real-feedback',
        label: 'Get honest feedback on my performance',
        prefill:
          "Give me a manager-grade, honest assessment of how I'm actually performing — not the polite version. Where am I strong, where am I weak, what would a real reviewer say.",
      },
      {
        id: 'improve-areas',
        label: 'Identify where to focus and improve',
        prefill:
          'Identify the two or three areas where focused work would unlock the biggest jump in my impact — and give me a plan to close them.',
      },
      {
        id: 'stay-valuable',
        label: 'Stay valuable as the world changes',
        prefill:
          'Tell me what to learn — given the current state of the field and how it is changing — to stay high-value over the next 12 to 24 months.',
      },
      {
        id: 'sense-next',
        label: "Make sense of what's next for me",
        prefill:
          'Help me figure out what the next chapter should be — moves, growth bets, where to invest my energy.',
      },
    ],
  },
];

const HORIZONS = ['6 weeks', '12 weeks', '6 months', '1 year'];
const TENURE = ['< 1 yr', '1–3 yrs', '3–5 yrs', '5+ yrs'];

export default function Setup() {
  const router = useRouter();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('choose');

  // Step-1 inputs
  const [freeGoal, setFreeGoal] = useState('');
  // Step-2 inputs
  const [goalText, setGoalText] = useState('');
  const [chosenIntent, setChosenIntent] = useState<GoalIntent | undefined>(undefined);
  const [currentRole, setCurrentRole] = useState('');
  const [tenure, setTenure] = useState<string | null>(null);
  const [working, setWorking] = useState('');
  const [notWorking, setNotWorking] = useState('');
  const [constraints, setConstraints] = useState('');
  const [horizon, setHorizon] = useState('12 weeks');

  // When picking a template, prefill goal text + load any known
  // profile role so the user doesn't retype it. The intent flows
  // through to createGoal so the AI-tailored path matches the
  // chosen goal type rather than being inferred from text.
  async function pickTemplate(t: Template) {
    setGoalText(t.prefill);
    setChosenIntent(t.id);
    const p = await getProfile();
    if (p.role) setCurrentRole(p.role);
    setStep('context');
  }

  async function useFreeGoal() {
    const v = freeGoal.trim();
    if (!v) return;
    setGoalText(v);
    setChosenIntent(undefined); // free-text → infer intent from keywords
    const p = await getProfile();
    if (p.role) setCurrentRole(p.role);
    setStep('context');
  }

  function goTalkItThrough() {
    router.replace('/career/chat?preset=clarity' as any);
  }

  async function buildPath() {
    const title = goalText.trim();
    if (!title) return;
    setStep('thinking');
    // Concatenate the rich context into the Goal's context field.
    // The real agent backend (production: prompt template in
    // src/companion/playbook.ts) reads this to produce specific,
    // manager-grade analysis rather than generic career advice.
    const ctx = [
      currentRole ? `Current role: ${currentRole}` : null,
      tenure ? `Time in role: ${tenure}` : null,
      working ? `What's been working: ${working}` : null,
      notWorking ? `What hasn't: ${notWorking}` : null,
      constraints ? `Constraints: ${constraints}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    // Persist key fields back to profile so future setups don't re-ask.
    if (currentRole.trim()) await setProfile({ role: currentRole.trim() });

    await new Promise((r) => setTimeout(r, 1200));
    await createGoal({ title, context: ctx, horizon, intent: chosenIntent });
    router.replace('/career' as any);
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => (step === 'choose' ? router.back() : setStep('choose'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{
            width: 40,
            height: 40,
            borderRadius: layout.radius.full,
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color={colors.ink} strokeWidth={1.75} />
        </Pressable>
      </View>

      {step === 'choose' && (
        <>
          <Rise>
            <View style={{ gap: 4, marginTop: space.sm }}>
              <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
                STEP 1 OF 2
              </Text>
              <Text variant="display" style={{ fontSize: 38, lineHeight: 42 }}>
                Tell me what you want to{' '}
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular_Italic',
                    color: colors.accent,
                    fontSize: 38,
                  }}
                >
                  achieve.
                </Text>
              </Text>
            </View>
          </Rise>

          {/* Free-text input — the primary affordance. Templates are
              inspiration; the user is encouraged to write their own. */}
          <Rise delay={60}>
            <View style={{ gap: space.xs }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: space.sm,
                }}
              >
                <TextInput
                  value={freeGoal}
                  onChangeText={setFreeGoal}
                  placeholder="e.g. Tell me honestly where my work is weakest — and how to fix it."
                  placeholderTextColor={colors.inkSoft}
                  multiline
                  accessibilityLabel="Goal in your own words"
                  style={{
                    flex: 1,
                    minHeight: 60,
                    maxHeight: 140,
                    borderRadius: layout.radius.control,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    padding: space.md,
                    color: colors.ink,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 16,
                    lineHeight: 22,
                    backgroundColor: colors.card,
                  }}
                />
              </View>
              <Pressable
                onPress={useFreeGoal}
                disabled={!freeGoal.trim()}
                accessibilityRole="button"
                accessibilityLabel="Use this as my goal"
                style={{
                  backgroundColor: colors.accent,
                  paddingVertical: space.sm,
                  paddingHorizontal: space.md,
                  borderRadius: layout.radius.full,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minHeight: 46,
                  opacity: freeGoal.trim() ? 1 : 0.45,
                  alignSelf: 'flex-start',
                }}
              >
                <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '700', fontSize: 13 }}>
                  Use this as my goal
                </Text>
                <ArrowRight size={14} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
            </View>
          </Rise>

          {/* Template groups */}
          {GROUPS.map((group, gi) => {
            const GroupIcon = group.icon;
            return (
              <Rise key={group.title} delay={120 + gi * 60}>
                <View style={{ gap: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: colors.canvas,
                        borderColor: colors.hairline,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GroupIcon size={12} color={colors.accent} strokeWidth={2} />
                    </View>
                    <Text
                      variant="caption"
                      style={{
                        letterSpacing: 0.5,
                        fontWeight: '700',
                        fontSize: 11,
                      }}
                    >
                      {group.title.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ gap: space.xs }}>
                    {group.items.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => pickTemplate(t)}
                        accessibilityRole="button"
                        accessibilityLabel={t.label}
                        style={{
                          flexDirection: 'row',
                          gap: space.sm,
                          alignItems: 'center',
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm,
                          backgroundColor: colors.card,
                          borderColor: colors.hairline,
                          borderWidth: 1,
                          borderRadius: layout.radius.control,
                          minHeight: 48,
                        }}
                      >
                        <Text variant="body" style={{ flex: 1, fontWeight: '500' }}>
                          {t.label}
                        </Text>
                        <ArrowRight size={14} color={colors.inkSoft} strokeWidth={1.75} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </Rise>
            );
          })}

          {/* "Talk it through" fallback */}
          <Rise delay={320}>
            <Pressable
              onPress={goTalkItThrough}
              accessibilityRole="button"
              accessibilityLabel="Not sure — talk it through first"
              style={{
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'center',
                padding: space.md,
                backgroundColor: colors.ink,
                borderRadius: layout.radius.control,
                minHeight: 54,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={14} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text variant="body" color="#FFFFFF" style={{ flex: 1, fontWeight: '600' }}>
                I'm not sure — talk it through
              </Text>
              <ArrowRight size={14} color="rgba(255,255,255,0.6)" strokeWidth={1.75} />
            </Pressable>
          </Rise>
        </>
      )}

      {step === 'context' && (
        <>
          <Rise>
            <View style={{ gap: 6, marginTop: space.sm }}>
              <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
                STEP 2 OF 2 · TELL ME MORE
              </Text>
              <Text variant="display" style={{ fontSize: 36, lineHeight: 40, letterSpacing: -0.6 }}>
                The more you give,{' '}
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular_Italic',
                    color: colors.accent,
                    fontSize: 36,
                    letterSpacing: -0.6,
                  }}
                >
                  the sharper the path.
                </Text>
              </Text>
              <Text variant="lede" soft style={{ marginTop: 4 }}>
                This is where you stop us giving you fluff. Real specifics
                here = manager-grade analysis back, not generic career advice.
              </Text>
            </View>
          </Rise>

          {/* Goal text (editable, prefilled from template) */}
          <Rise delay={60}>
            <Card style={{ gap: space.sm }}>
              <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                YOUR GOAL
              </Text>
              <TextInput
                value={goalText}
                onChangeText={setGoalText}
                placeholder="The goal in your own words"
                placeholderTextColor={colors.inkSoft}
                multiline
                accessibilityLabel="Your goal"
                style={{
                  minHeight: 84,
                  borderRadius: layout.radius.control,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  padding: space.md,
                  color: colors.ink,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 16,
                  lineHeight: 22,
                  backgroundColor: colors.canvas,
                }}
              />
            </Card>
          </Rise>

          {/* Current role + tenure */}
          <Rise delay={120}>
            <Card style={{ gap: space.md }}>
              <View style={{ gap: 6 }}>
                <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                  YOUR CURRENT ROLE
                </Text>
                <TextInput
                  value={currentRole}
                  onChangeText={setCurrentRole}
                  placeholder="e.g. Senior PM at a Series B startup, or between jobs, or in school"
                  placeholderTextColor={colors.inkSoft}
                  accessibilityLabel="Current role"
                  style={{
                    minHeight: layout.controlHeight,
                    borderRadius: layout.radius.control,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    paddingHorizontal: space.md,
                    color: colors.ink,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 16,
                    backgroundColor: colors.canvas,
                  }}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                  HOW LONG IN THIS ROLE?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                  {TENURE.map((t) => {
                    const on = tenure === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setTenure(t)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={{
                          paddingHorizontal: space.md,
                          paddingVertical: space.xs,
                          borderRadius: layout.radius.full,
                          backgroundColor: on ? colors.ink : 'transparent',
                          borderColor: on ? colors.ink : colors.hairline,
                          borderWidth: 1,
                        }}
                      >
                        <Text
                          variant="caption"
                          color={on ? '#FFFFFF' : colors.ink}
                          style={{ fontWeight: '600', letterSpacing: 0.3, fontSize: 12 }}
                        >
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          </Rise>

          {/* Working / not working / constraints */}
          <Rise delay={180}>
            <Card style={{ gap: space.md }}>
              <View style={{ gap: 6 }}>
                <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                  WHAT'S BEEN WORKING
                </Text>
                <TextInput
                  value={working}
                  onChangeText={setWorking}
                  placeholder="Wins, strengths, what people consistently come to you for…"
                  placeholderTextColor={colors.inkSoft}
                  multiline
                  accessibilityLabel="What is working"
                  style={{
                    minHeight: 64,
                    borderRadius: layout.radius.control,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    padding: space.md,
                    color: colors.ink,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 16,
                    backgroundColor: colors.canvas,
                  }}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                  WHAT HASN'T
                </Text>
                <TextInput
                  value={notWorking}
                  onChangeText={setNotWorking}
                  placeholder="Where you're stuck, the gap you suspect, the feedback you keep getting…"
                  placeholderTextColor={colors.inkSoft}
                  multiline
                  accessibilityLabel="What hasn't been working"
                  style={{
                    minHeight: 64,
                    borderRadius: layout.radius.control,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    padding: space.md,
                    color: colors.ink,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 16,
                    backgroundColor: colors.canvas,
                  }}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                  CONSTRAINTS (OPTIONAL)
                </Text>
                <TextInput
                  value={constraints}
                  onChangeText={setConstraints}
                  placeholder="Time, location, family, visa, money runway… anything that bounds what's realistic"
                  placeholderTextColor={colors.inkSoft}
                  multiline
                  accessibilityLabel="Constraints"
                  style={{
                    minHeight: 56,
                    borderRadius: layout.radius.control,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    padding: space.md,
                    color: colors.ink,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 16,
                    backgroundColor: colors.canvas,
                  }}
                />
              </View>
            </Card>
          </Rise>

          {/* Horizon */}
          <Rise delay={240}>
            <View style={{ gap: 6 }}>
              <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                BY WHEN?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                {HORIZONS.map((h) => {
                  const on = horizon === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setHorizon(h)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={{
                        paddingHorizontal: space.md,
                        paddingVertical: space.xs,
                        borderRadius: layout.radius.full,
                        backgroundColor: on ? colors.ink : 'transparent',
                        borderColor: on ? colors.ink : colors.hairline,
                        borderWidth: 1,
                      }}
                    >
                      <Text
                        variant="caption"
                        color={on ? '#FFFFFF' : colors.ink}
                        style={{ fontWeight: '600', letterSpacing: 0.3, fontSize: 12 }}
                      >
                        {h}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Rise>

          <Rise delay={300}>
            <Pressable
              onPress={buildPath}
              disabled={!goalText.trim()}
              accessibilityRole="button"
              accessibilityLabel="Build my path"
              style={{
                backgroundColor: colors.accent,
                paddingVertical: space.md,
                borderRadius: layout.radius.full,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                minHeight: 54,
                opacity: goalText.trim() ? 1 : 0.45,
                ...shadow.raised,
              }}
            >
              <Text variant="button" color="#FFFFFF">
                Build my path
              </Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.25} />
            </Pressable>
          </Rise>
        </>
      )}

      {step === 'thinking' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingVertical: space['2xl'] }}>
          <MotiView
            from={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1.04, opacity: 1 }}
            transition={{
              type: 'timing',
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              loop: true,
              repeatReverse: true,
            }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              ...shadow.raised,
            }}
          >
            <Sparkles size={28} color="#FFFFFF" strokeWidth={2} />
          </MotiView>
          <View style={{ gap: 4, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 28,
                color: colors.ink,
                letterSpacing: -0.3,
              }}
            >
              Building your path…
            </Text>
            <Text variant="caption" soft style={{ textAlign: 'center', maxWidth: 280 }}>
              Reading what you wrote, sequencing the phases, picking the
              first week of tasks. Specific to you, not a template.
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}
