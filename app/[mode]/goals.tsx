/**
 * Goals — the path detail. The AI agent's research output, made navigable.
 * Shows the goal at the top, then phases as expandable stacks of tasks
 * with progress meta on each. "Talk to your agent" jumps to Chat scoped
 * to plan revision.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MessageCircle, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space } from '@/design/tokens';
import {
  Button,
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
  type Goal,
  type Phase,
} from '@/companion/goals';

function PhaseCard({
  phase,
  index,
  total,
  onToggleTask,
  onOpenTask,
}: {
  phase: Phase;
  index: number;
  total: number;
  onToggleTask: (taskId: string, currentStatus: 'todo' | 'done' | 'skipped') => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { colors } = useTheme();
  const doneCount = phase.tasks.filter((t) => t.status === 'done').length;
  const pct = phase.tasks.length === 0 ? 0 : Math.round((doneCount / phase.tasks.length) * 100);
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: layout.radius.full,
                backgroundColor:
                  phase.status === 'done'
                    ? colors.encourage
                    : phase.status === 'in_progress'
                    ? colors.accent
                    : colors.hairline,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variant="caption"
                color={phase.status === 'upcoming' ? colors.inkSoft : '#FFFFFF'}
                style={{ fontWeight: '700', fontSize: 11 }}
              >
                {index + 1}
              </Text>
            </View>
            <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
              {phase.meta.toUpperCase()}
            </Text>
          </View>
          <Chip
            label={
              phase.status === 'done'
                ? 'Done'
                : phase.status === 'in_progress'
                ? 'In progress'
                : 'Upcoming'
            }
            variant={
              phase.status === 'done'
                ? 'success'
                : phase.status === 'in_progress'
                ? 'filled'
                : 'muted'
            }
          />
        </View>
        <Text variant="h3" style={{ fontSize: 20 }}>
          {phase.title}
        </Text>
        <Text variant="body" soft style={{ marginTop: 2 }}>
          {phase.outcome}
        </Text>
      </View>

      {phase.tasks.length > 0 && (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" soft>
              {doneCount} of {phase.tasks.length} complete
            </Text>
            <Text variant="caption" soft>
              {pct}%
            </Text>
          </View>
          <ProgressBar value={pct} height={3} />
        </View>
      )}

      {phase.tasks.length === 0 ? (
        <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center', paddingVertical: space.xs }}>
          <Icon glyph={Sparkles} soft size={16} />
          <Text variant="caption" soft>
            Your agent will plan this phase when you reach it.
          </Text>
        </View>
      ) : (
        <View>
          {phase.tasks.map((t, i) => (
            <View
              key={t.id}
              style={{
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.hairline,
              }}
            >
              <TaskRow
                label={t.title}
                caption={t.effort ? `${t.effort}${t.why ? ' · ' + t.why : ''}` : t.why}
                done={t.status === 'done'}
                onToggle={() => onToggleTask(t.id, t.status)}
                onOpen={() => onOpenTask(t.id)}
              />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function Goals() {
  const router = useRouter();
  const { colors } = useTheme();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setGoal(await getActiveGoal());
      })();
    }, [tick]),
  );

  if (!goal) {
    return (
      <Screen>
        <Rise>
          <View style={{ gap: 6 }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              GOALS
            </Text>
            <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
              Nothing yet.
            </Text>
          </View>
        </Rise>
        <Rise delay={60}>
          <Text variant="lede" soft>
            Tell your companion what you want — a transition, a promotion,
            a new job — and they'll research it and build a step-by-step
            path with weekly phases and daily tasks.
          </Text>
        </Rise>
        <Rise delay={120}>
          <Button label="Set up my goal" onPress={() => router.push('/career/setup' as any)} />
        </Rise>
        <Rise delay={180}>
          <Button
            label="Talk it through first"
            variant="ghost"
            onPress={() => router.push('/career/chat?preset=clarity' as any)}
          />
        </Rise>
      </Screen>
    );
  }

  const p = progress(goal);
  const started = new Date(goal.startedAt);
  const daysIn = Math.max(
    0,
    Math.floor((Date.now() - started.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Screen>
      <Rise>
        <View style={{ gap: 6 }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            YOUR GOAL · DAY {daysIn + 1}
          </Text>
          <Text variant="display" style={{ fontSize: 34, lineHeight: 40, letterSpacing: -0.4 }}>
            {goal.title}
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <Card tone="wash">
          <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
            AGENT'S FRAMING
          </Text>
          <Text variant="voice" style={{ marginTop: 4 }}>
            {goal.framing}
          </Text>
        </Card>
      </Rise>

      <Rise delay={120}>
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: layout.radius.card,
              padding: space.md,
              gap: 4,
            }}
          >
            <Text variant="caption" soft style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 10 }}>
              PROGRESS
            </Text>
            <Text variant="h2" style={{ fontSize: 24 }}>
              {p.pct}%
            </Text>
            <Text variant="caption" soft>
              {p.done} of {p.total} tasks
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: layout.radius.card,
              padding: space.md,
              gap: 4,
            }}
          >
            <Text variant="caption" soft style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 10 }}>
              HORIZON
            </Text>
            <Text variant="h2" style={{ fontSize: 24 }}>
              {goal.horizon}
            </Text>
            <Text variant="caption" soft>
              from start
            </Text>
          </View>
        </View>
      </Rise>

      <Rise delay={180}>
        <View style={{ gap: space.md }}>
          {goal.phases.map((ph, i) => (
            <PhaseCard
              key={ph.id}
              phase={ph}
              index={i}
              total={goal.phases.length}
              onToggleTask={async (taskId, current) => {
                await setTaskStatus(taskId, current === 'done' ? 'todo' : 'done');
                setTick((t) => t + 1);
              }}
              onOpenTask={(taskId) => router.push(`/career/task/${taskId}` as any)}
            />
          ))}
        </View>
      </Rise>

      <Rise delay={240}>
        <Pressable
          onPress={() => router.navigate('/career/chat' as any)}
          accessibilityRole="button"
          accessibilityLabel="Talk to your agent about the path"
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
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={18} color="#FFFFFF" strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              Adjust this path
            </Text>
            <Text variant="caption" soft>
              Tell your agent what to change — it'll re-plan around it.
            </Text>
          </View>
        </Pressable>
      </Rise>
    </Screen>
  );
}
