/**
 * Today — the home tab. Goal-first dashboard. Shows:
 *   - Today's date + tasks from your active path
 *   - The active goal at a glance (title, phase, progress)
 *   - One-tap to drill into the full path
 *   - Quick capture for a custom task
 *
 * The chat is no longer the home; it's its own tab. The user lives in
 * tasks and progress; chat is a thing they open when they need to think.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ArrowRight, ArrowUpRight, MessageCircle, Plus, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, shadow, space } from '@/design/tokens';
import {
  Card,
  Chip,
  Icon,
  ProgressBar,
  Rise,
  Screen,
  TaskRow,
} from '@/components/ui';
import {
  getActiveGoal,
  progress,
  setTaskStatus,
  todaysTasks,
  type Goal,
} from '@/companion/goals';
import { getProfile } from '@/profile';
import { findCharacter, type Character } from '@/companion/characters';

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const { colors } = useTheme();
  const p = progress(goal);
  const current = goal.phases.find((ph) => ph.status === 'in_progress') ?? goal.phases[0];
  const phaseIdx = goal.phases.findIndex((ph) => ph.id === current?.id) + 1;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open goal: ${goal.title}`}
      style={{
        backgroundColor: colors.ink,
        borderRadius: layout.radius.card,
        padding: space.lg,
        gap: space.md,
        ...shadow.raised,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="caption" color={colors.accent} style={{ letterSpacing: 0.6, fontWeight: '600', textTransform: 'uppercase', fontSize: 11 }}>
            Active goal
          </Text>
          <Text
            variant="h3"
            color="#FFFFFF"
            style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, letterSpacing: -0.2 }}
          >
            {goal.title}
          </Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: layout.radius.full,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowUpRight size={16} color="#FFFFFF" strokeWidth={2} />
        </View>
      </View>

      <View style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" color="rgba(255,255,255,0.65)">
            Phase {phaseIdx} of {goal.phases.length} · {current?.title}
          </Text>
          <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '600' }}>
            {p.pct}%
          </Text>
        </View>
        <ProgressBar value={p.pct} color={colors.accent} height={5} />
        <Text variant="caption" color="rgba(255,255,255,0.5)" style={{ marginTop: 2 }}>
          {p.done} of {p.total} tasks · {goal.horizon}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Today() {
  const router = useRouter();
  const { colors } = useTheme();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [items, setItems] = useState<Awaited<ReturnType<typeof todaysTasks>>>([]);
  const [companion, setCompanion] = useState<Character | null>(null);
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setGoal(await getActiveGoal());
        setItems(await todaysTasks());
        const p = await getProfile();
        setCompanion(findCharacter(p.companionId));
      })();
    }, [tick]),
  );

  const today = new Date();
  const dateLabel = today
    .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();

  // ------------------------------------------------------------------
  // First-time user — no goal yet. Show the walkthrough invitation
  // instead of any pre-baked mock content.
  // ------------------------------------------------------------------
  if (!goal) {
    const companionName = companion?.name ?? 'your companion';
    return (
      <Screen>
        <Rise>
          <View style={{ gap: 6 }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              {dateLabel}
            </Text>
            <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
              Today
            </Text>
          </View>
        </Rise>

        <Rise delay={60}>
          <View
            style={{
              backgroundColor: colors.ink,
              borderRadius: layout.radius.card,
              padding: space.lg,
              gap: space.md,
              ...shadow.raised,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Sparkles size={14} color={colors.accent} strokeWidth={2} />
              <Text
                variant="caption"
                color={colors.accent}
                style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}
              >
                LET'S START
              </Text>
            </View>
            <Text
              color="#FFFFFF"
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 30,
                lineHeight: 34,
                letterSpacing: -0.4,
              }}
            >
              What are you trying to{' '}
              <Text
                style={{
                  fontFamily: 'InstrumentSerif_400Regular_Italic',
                  color: colors.accent,
                  fontSize: 30,
                  letterSpacing: -0.4,
                }}
              >
                achieve?
              </Text>
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)">
              Tell {companionName} what you want — a transition, a
              promotion, an offer — and they'll build you a path with
              weekly phases and daily tasks. Dynamic to your goal, not
              generic advice.
            </Text>

            <Pressable
              onPress={() => router.push('/career/setup' as any)}
              accessibilityRole="button"
              accessibilityLabel="Set up your goal"
              style={{
                marginTop: space.xs,
                backgroundColor: colors.accent,
                borderRadius: layout.radius.full,
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                minHeight: 52,
              }}
            >
              <Text variant="button" color="#FFFFFF">
                Set up my goal
              </Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.25} />
            </Pressable>
          </View>
        </Rise>

        <Rise delay={120}>
          <Pressable
            onPress={() => router.push('/career/chat?preset=clarity' as any)}
            accessibilityRole="button"
            accessibilityLabel="Talk it through first"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              padding: space.md,
              borderRadius: layout.radius.card,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: layout.radius.full,
                backgroundColor: colors.canvas,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageCircle size={18} color={colors.ink} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                Not sure yet? Let's talk it through.
              </Text>
              <Text variant="caption" soft>
                {companionName} can help you figure out what's next.
              </Text>
            </View>
            <ArrowRight size={14} color={colors.inkSoft} strokeWidth={1.75} />
          </Pressable>
        </Rise>

        <Rise delay={180}>
          <View style={{ gap: space.xs, marginTop: space.sm }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              WHAT YOU'LL GET
            </Text>
            {[
              { glyph: Sparkles, t: 'A path tailored to your goal' },
              { glyph: ArrowUpRight, t: 'Weekly phases, daily tasks' },
              { glyph: MessageCircle, t: 'Chat to adjust or rethink anything' },
            ].map((row) => (
              <View
                key={row.t}
                style={{
                  flexDirection: 'row',
                  gap: space.sm,
                  alignItems: 'center',
                  paddingVertical: space.xs,
                }}
              >
                <Icon glyph={row.glyph} soft size={16} />
                <Text variant="body" soft>
                  {row.t}
                </Text>
              </View>
            ))}
          </View>
        </Rise>
      </Screen>
    );
  }

  return (
    <Screen>
      <Rise>
        <View style={{ gap: 6 }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            {dateLabel}
          </Text>
          <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
            Today
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <GoalCard goal={goal} onOpen={() => router.navigate('/career/goals' as any)} />
      </Rise>

      <Rise delay={120}>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              ON YOUR PATH · TODAY
            </Text>
            <Text variant="caption" soft>
              {items.length} {items.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>

          <Card style={{ padding: 0, paddingVertical: space.xs, paddingHorizontal: space.lg }}>
            {items.length === 0 ? (
              <View style={{ paddingVertical: space.lg, alignItems: 'center', gap: space.xs }}>
                <Icon glyph={Sparkles} soft size={22} />
                <Text variant="body" soft style={{ textAlign: 'center' }}>
                  No tasks scheduled for today.{'\n'}Open your path to plan the next step.
                </Text>
              </View>
            ) : (
              items.map((it, idx) => (
                <View
                  key={it.task.id}
                  style={{
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.hairline,
                  }}
                >
                  <TaskRow
                    label={it.task.title}
                    caption={it.task.why ?? `${it.phase.title} · ${it.task.effort ?? ''}`}
                    done={it.task.status === 'done'}
                    onToggle={async () => {
                      await setTaskStatus(
                        it.task.id,
                        it.task.status === 'done' ? 'todo' : 'done',
                      );
                      setTick((t) => t + 1);
                    }}
                  />
                </View>
              ))
            )}
          </Card>
        </View>
      </Rise>

      <Rise delay={180}>
        <View style={{ gap: space.sm }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            QUICK CAPTURE
          </Text>
          <Pressable
            onPress={() => router.navigate('/career/chat' as any)}
            accessibilityRole="button"
            accessibilityLabel="Add a task or talk to your agent"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: layout.radius.control,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              minHeight: 48,
            }}
          >
            <Plus size={18} color={colors.inkSoft} strokeWidth={1.75} />
            <Text variant="body" soft style={{ flex: 1 }}>
              Add a task, or talk to your agent
            </Text>
          </Pressable>
          <Text variant="caption" soft>
            Goes straight into Chat — your agent picks the right place for it.
          </Text>
        </View>
      </Rise>

      {goal && (
        <Rise delay={240}>
          <View style={{ gap: space.sm }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              PHASES
            </Text>
            <View style={{ gap: space.xs }}>
              {goal.phases.map((ph) => (
                <View
                  key={ph.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: space.sm,
                    paddingHorizontal: space.md,
                    backgroundColor: colors.card,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                    borderRadius: layout.radius.control,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {ph.title}
                    </Text>
                    <Text variant="caption" soft>
                      {ph.meta}
                    </Text>
                  </View>
                  <Chip
                    label={
                      ph.status === 'done'
                        ? 'Done'
                        : ph.status === 'in_progress'
                        ? 'Now'
                        : 'Soon'
                    }
                    variant={
                      ph.status === 'done'
                        ? 'success'
                        : ph.status === 'in_progress'
                        ? 'filled'
                        : 'muted'
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        </Rise>
      )}
    </Screen>
  );
}
