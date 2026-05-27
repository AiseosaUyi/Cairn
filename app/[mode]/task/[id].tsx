/**
 * Task Workspace — the page where the user actually DOES the task.
 *
 * Founder direction (2026-05-27): Cairn was reading as a beautiful
 * checklist. The path is right; the verb is missing. The fix: when you
 * tap a task you don't toggle a checkbox — you open a workspace where
 * the coach helps you do the work.
 *
 * Tabs surfaced are driven by the task's `kind`:
 *   write    → Template (agent-filled scaffold), Examples, Submit+Review
 *   review   → Submit URL or paste content → review with honesty band
 *   research → Examples + Notes
 *   outreach → Template (DM/email), Submit+Review
 *   reflect  → Template (reflection scaffold), Notes
 *   schedule → Calendar block (.ics download + Google Calendar link)
 *   do       → Coach only (no preset workspace surface)
 *
 * Coach is always available — opens the per-task chat thread by jumping
 * to /chat?taskId=… so the global chat surface picks up the task scope.
 *
 * Server calls go through src/companion/workspace.ts, which falls back
 * to honest "preview shape" mocks when the OpenAI key isn't configured —
 * the workspace never fakes coaching content.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Check,
  ExternalLink,
  FileText,
  MessageCircle,
  Search,
  Star,
} from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, shadow, space } from '@/design/tokens';
import { Button, Card, Chip, Icon, Rise, Screen } from '@/components/ui';
import {
  findTask,
  setTaskStatus,
  type Goal,
  type Phase,
  type Task,
  type TaskKind,
} from '@/companion/goals';
import {
  listArtifacts,
  saveArtifact,
  type Artifact,
  type ArtifactExample,
  type ArtifactReview,
  type ArtifactScore,
} from '@/companion/artifacts';
import {
  fetchExamples,
  fetchPortfolioReview,
  fetchReview,
  fetchScore,
  fetchTemplate,
} from '@/companion/workspace';
import { downloadIcs, googleCalendarUrl } from '@/pwa/calendar';
import { coachLabel, getProfile } from '@/profile';
import type { Mode } from '@/design/tokens';

type TabKey = 'coach' | 'template' | 'examples' | 'review' | 'schedule';

// Maps task kind → tabs that make sense for that kind. Coach is always
// first (the per-task chat is the safety net for anything else).
function tabsForKind(kind: TaskKind | undefined): TabKey[] {
  switch (kind) {
    case 'write':
      return ['coach', 'template', 'examples', 'review'];
    case 'review':
      return ['coach', 'review', 'examples'];
    case 'research':
      return ['coach', 'examples'];
    case 'outreach':
      return ['coach', 'template', 'review'];
    case 'reflect':
      return ['coach', 'template'];
    case 'schedule':
      return ['coach', 'schedule'];
    case 'do':
    default:
      return ['coach'];
  }
}

const TAB_META: Record<TabKey, { label: string; icon: typeof MessageCircle }> = {
  coach: { label: 'Coach', icon: MessageCircle },
  template: { label: 'Template', icon: FileText },
  examples: { label: 'Examples', icon: Search },
  review: { label: 'Review', icon: Star },
  schedule: { label: 'Schedule', icon: Calendar },
};

export default function TaskWorkspace() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [ctx, setCtx] = useState<{ goal: Goal; phase: Phase; task: Task } | null>(null);
  const [companionName, setCompanionName] = useState<string>('your companion');
  const [active, setActive] = useState<TabKey>('coach');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      const found = await findTask(id);
      if (!found) return;
      setCtx(found);
      const p = await getProfile();
      setCompanionName(coachLabel(p, mode as Mode));
      const arts = await listArtifacts({ taskId: id });
      setArtifacts(arts);
      // Pick the first relevant tab for the task kind by default,
      // skipping 'coach' so the workspace lands on a do-thing surface.
      const tabs = tabsForKind(found.task.kind);
      setActive(tabs[1] ?? tabs[0]);
    })();
  }, [id, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  if (!ctx) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  const { goal, phase, task } = ctx;
  const tabs = tabsForKind(task.kind);
  const userContext = `Goal: ${goal.title}. Phase: ${phase.title} (${phase.meta}). Outcome of this phase: ${phase.outcome}.${
    goal.context ? ` Background: ${goal.context}` : ''
  }`;

  const onToggleDone = async () => {
    await setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done');
    reload();
  };

  return (
    <Screen>
      <Rise>
        <View style={{ gap: space.sm }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <ArrowLeft size={16} color={colors.inkSoft} strokeWidth={1.75} />
            <Text variant="caption" soft>
              Back to {phase.title}
            </Text>
          </Pressable>

          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Chip
                label={(task.kind ?? 'do').toUpperCase()}
                variant={task.status === 'done' ? 'success' : 'filled'}
              />
              {task.effort && (
                <Text variant="caption" soft style={{ fontSize: 12 }}>
                  · {task.effort}
                </Text>
              )}
            </View>
            <Text variant="display" style={{ fontSize: 26, lineHeight: 30 }}>
              {task.title}
            </Text>
            {task.why && (
              <Text variant="body" soft style={{ lineHeight: 22 }}>
                {task.why}
              </Text>
            )}
          </View>
        </View>
      </Rise>

      <Rise delay={60}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {tabs.map((k) => {
            const Meta = TAB_META[k];
            const isActive = active === k;
            return (
              <Pressable
                key={k}
                onPress={() => setActive(k)}
                accessibilityRole="button"
                accessibilityLabel={Meta.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: space.md,
                  paddingVertical: 8,
                  borderRadius: layout.radius.full,
                  backgroundColor: isActive ? colors.ink : colors.card,
                  borderColor: isActive ? colors.ink : colors.hairline,
                  borderWidth: 1,
                  minHeight: 36,
                }}
              >
                <Meta.icon
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.ink}
                  strokeWidth={1.75}
                />
                <Text
                  variant="caption"
                  color={isActive ? '#FFFFFF' : colors.ink}
                  style={{ fontWeight: '600', fontSize: 12 }}
                >
                  {Meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Rise>

      <Rise delay={120}>
        {active === 'coach' && (
          <CoachTab
            mode={mode}
            taskId={task.id}
            companionName={companionName}
          />
        )}
        {active === 'template' && (
          <TemplateTab
            task={task}
            userContext={userContext}
            goalId={goal.id}
            artifacts={artifacts}
            onSaved={reload}
          />
        )}
        {active === 'examples' && (
          <ExamplesTab
            task={task}
            userContext={userContext}
            goalId={goal.id}
            artifacts={artifacts}
            onSaved={reload}
          />
        )}
        {active === 'review' && (
          <ReviewTab
            task={task}
            userContext={userContext}
            goalId={goal.id}
            artifacts={artifacts}
            onSaved={reload}
          />
        )}
        {active === 'schedule' && <ScheduleTab task={task} />}
      </Rise>

      <Rise delay={180}>
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            paddingTop: space.md,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            marginTop: space.md,
          }}
        >
          <Button
            label={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
            onPress={onToggleDone}
            variant={task.status === 'done' ? 'soft' : 'primary'}
            style={{ flex: 1 }}
          />
        </View>
      </Rise>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Coach tab — quick entry to the per-task chat thread + a small explainer.
// The full chat lives in /[mode]/chat?taskId=… so the existing thread UI
// is reused; that route also primes the system prompt with task context.
// ---------------------------------------------------------------------------

function CoachTab({
  mode,
  taskId,
  companionName,
}: {
  mode: string;
  taskId: string;
  companionName: string;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Card style={{ gap: space.md }}>
      <Text variant="h3" style={{ fontSize: 18 }}>
        Talk it through with {companionName}
      </Text>
      <Text variant="body" soft style={{ lineHeight: 22 }}>
        Open a chat thread scoped to this task. {companionName} already
        has your goal, phase, and the task context — no need to re-explain.
      </Text>
      <Button
        label="Open chat scoped to this task"
        onPress={() => router.push(`/${mode}/chat?taskId=${taskId}` as any)}
      />
      <Text variant="caption" soft>
        Tip: paste a rough draft into chat to get a quick reaction before
        you formalize it in the Review tab.
      </Text>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Template tab — agent-prefilled starter, copy-able. Saves as Artifact.
// ---------------------------------------------------------------------------

function TemplateTab({
  task,
  userContext,
  goalId,
  artifacts,
  onSaved,
}: {
  task: Task;
  userContext: string;
  goalId: string;
  artifacts: Artifact[];
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const existing = useMemo(
    () => artifacts.find((a) => a.kind === 'template'),
    [artifacts],
  );
  const [draft, setDraft] = useState<string>(existing?.body ?? '');

  const generate = async () => {
    setBusy(true);
    try {
      const t = await fetchTemplate({
        taskTitle: task.title,
        taskKind: task.kind,
        taskWhy: task.why,
        userContext,
      });
      await saveArtifact({
        taskId: task.id,
        goalId,
        kind: 'template',
        title: t.title,
        body: t.body,
      });
      setDraft(t.body);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Text variant="h3" style={{ fontSize: 18 }}>
          Starter template
        </Text>
        <Text variant="caption" soft>
          Pre-filled with your context. Edit it here, then submit it to the
          Review tab when ready.
        </Text>
      </View>

      {!existing && !draft && (
        <Button
          label={busy ? 'Generating…' : 'Generate template'}
          onPress={generate}
          busy={busy}
        />
      )}

      {(existing || draft) && (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Edit the template here…"
            placeholderTextColor={colors.inkSoft}
            style={{
              minHeight: 220,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: layout.radius.control,
              padding: space.md,
              color: colors.ink,
              backgroundColor: colors.canvas,
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              lineHeight: 22,
              textAlignVertical: 'top',
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <Button
              label="Regenerate"
              variant="soft"
              busy={busy}
              onPress={generate}
              style={{ flex: 1 }}
            />
            <Button
              label="Save draft"
              variant="primary"
              onPress={async () => {
                await saveArtifact({
                  taskId: task.id,
                  goalId,
                  kind: 'draft',
                  title: `Draft of "${task.title}"`,
                  body: draft,
                });
                onSaved();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Examples tab — 3-5 real-world examples to study.
// ---------------------------------------------------------------------------

function ExamplesTab({
  task,
  userContext,
  goalId,
  artifacts,
  onSaved,
}: {
  task: Task;
  userContext: string;
  goalId: string;
  artifacts: Artifact[];
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const existing = useMemo(
    () => artifacts.find((a) => a.kind === 'examples'),
    [artifacts],
  );
  const [examples, setExamples] = useState<ArtifactExample[]>(existing?.examples ?? []);
  const [note, setNote] = useState<string | null>(null);

  const fetchEx = async () => {
    setBusy(true);
    try {
      const r = await fetchExamples({
        taskTitle: task.title,
        taskKind: task.kind,
        userContext,
      });
      setExamples(r.examples);
      setNote(r.note ?? null);
      await saveArtifact({
        taskId: task.id,
        goalId,
        kind: 'examples',
        title: `Examples for "${task.title}"`,
        examples: r.examples,
        body: r.note,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Text variant="h3" style={{ fontSize: 18 }}>
          Examples to study
        </Text>
        <Text variant="caption" soft>
          Real-world examples your coach surfaces. Each has a one-line
          "why this works" so you can pattern-match.
        </Text>
      </View>

      {examples.length === 0 ? (
        <Button
          label={busy ? 'Searching…' : 'Show me examples'}
          onPress={fetchEx}
          busy={busy}
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {examples.map((ex, idx) => (
            <View
              key={`${ex.title}-${idx}`}
              style={{
                gap: 4,
                padding: space.md,
                borderRadius: layout.radius.control,
                backgroundColor: colors.canvas,
                borderColor: colors.hairline,
                borderWidth: 1,
              }}
            >
              <Text variant="body" style={{ fontWeight: '600' }}>
                {ex.title}
              </Text>
              <Text variant="caption" soft>
                {ex.oneLineWhy}
              </Text>
              {ex.url && (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    if (typeof window !== 'undefined') {
                      window.open(ex.url, '_blank', 'noopener');
                    }
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                >
                  <ExternalLink size={12} color={colors.accent} strokeWidth={1.75} />
                  <Text variant="caption" color={colors.accent}>
                    Open
                  </Text>
                </Pressable>
              )}
              {!ex.url && ex.source && (
                <Text variant="caption" soft style={{ fontSize: 11, marginTop: 2 }}>
                  Source: {ex.source}
                </Text>
              )}
            </View>
          ))}
          {note && (
            <Text variant="caption" soft style={{ fontStyle: 'italic' }}>
              {note}
            </Text>
          )}
          <Button label="Refresh examples" variant="soft" onPress={fetchEx} busy={busy} />
        </View>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Review tab — paste draft OR URL, get review + score with honesty band.
// ---------------------------------------------------------------------------

function ReviewTab({
  task,
  userContext,
  goalId,
  artifacts,
  onSaved,
}: {
  task: Task;
  userContext: string;
  goalId: string;
  artifacts: Artifact[];
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ArtifactReview | null>(
    artifacts.find((a) => a.kind === 'review')?.review ?? null,
  );
  const [score, setScore] = useState<ArtifactScore | null>(
    artifacts.find((a) => a.kind === 'score')?.score ?? null,
  );

  const trimmed = input.trim();
  const looksLikeUrl = /^https?:\/\//i.test(trimmed);

  const onReview = async () => {
    if (!trimmed) return;
    setBusy(true);
    try {
      if (looksLikeUrl) {
        const r = await fetchPortfolioReview({
          taskTitle: task.title,
          userContext,
          url: trimmed,
        });
        setReview(r);
        setScore(r.score ?? null);
        await saveArtifact({
          taskId: task.id,
          goalId,
          kind: 'review',
          title: `Portfolio review of ${trimmed}`,
          review: r,
          sourceUrl: trimmed,
        });
        if (r.score) {
          await saveArtifact({
            taskId: task.id,
            goalId,
            kind: 'score',
            title: `Score of ${trimmed}`,
            score: r.score,
            sourceUrl: trimmed,
          });
        }
      } else {
        const [r, s] = await Promise.all([
          fetchReview({
            taskTitle: task.title,
            taskKind: task.kind,
            userContext,
            draft: trimmed,
          }),
          fetchScore({
            taskTitle: task.title,
            taskKind: task.kind,
            userContext,
            draft: trimmed,
          }),
        ]);
        setReview(r);
        setScore(s);
        await saveArtifact({
          taskId: task.id,
          goalId,
          kind: 'review',
          title: `Review of your draft`,
          review: r,
        });
        await saveArtifact({
          taskId: task.id,
          goalId,
          kind: 'score',
          title: `Score`,
          score: s,
        });
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Text variant="h3" style={{ fontSize: 18 }}>
          Get this reviewed
        </Text>
        <Text variant="caption" soft>
          Paste your draft, or drop a URL (portfolio, LinkedIn About,
          resume page). You'll get a written review + a rubric score with
          a clear "what I saw / what I missed" band.
        </Text>
      </View>

      <TextInput
        value={input}
        onChangeText={setInput}
        multiline
        placeholder="Paste your draft or a URL (https://…)"
        placeholderTextColor={colors.inkSoft}
        style={{
          minHeight: 140,
          borderColor: colors.hairline,
          borderWidth: 1,
          borderRadius: layout.radius.control,
          padding: space.md,
          color: colors.ink,
          backgroundColor: colors.canvas,
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          lineHeight: 22,
          textAlignVertical: 'top',
        }}
      />

      <Button
        label={busy ? 'Reviewing…' : looksLikeUrl ? 'Review the URL' : 'Review my draft'}
        onPress={onReview}
        busy={busy}
        disabled={!trimmed}
      />

      {review && (
        <View style={{ gap: space.sm }}>
          <View
            style={{
              padding: space.md,
              borderRadius: layout.radius.control,
              backgroundColor: colors.canvas,
              borderColor: colors.hairline,
              borderWidth: 1,
              gap: 6,
            }}
          >
            <Text
              variant="caption"
              style={{ letterSpacing: 0.6, fontWeight: '700', fontSize: 11 }}
              color={colors.accent}
            >
              WHAT I SAW
            </Text>
            <Text variant="body" style={{ fontSize: 13, lineHeight: 20 }}>
              {review.whatISaw || '—'}
            </Text>
            <Text
              variant="caption"
              style={{ letterSpacing: 0.6, fontWeight: '700', fontSize: 11, marginTop: 6 }}
              soft
            >
              WHAT I MISSED
            </Text>
            <Text variant="body" soft style={{ fontSize: 13, lineHeight: 20 }}>
              {review.whatIMissed || '—'}
            </Text>
          </View>

          <Text variant="body" style={{ lineHeight: 22 }}>
            {review.body}
          </Text>
        </View>
      )}

      {score && score.dimensions.length > 0 && (
        <View
          style={{
            padding: space.md,
            borderRadius: layout.radius.control,
            backgroundColor: colors.ink,
            gap: space.sm,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color="rgba(255,255,255,0.65)" style={{ letterSpacing: 0.6, fontSize: 11, fontWeight: '700' }}>
              SCORE
            </Text>
            <Text
              color="#FFFFFF"
              style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 32 }}
            >
              {score.overall}<Text color="rgba(255,255,255,0.5)" style={{ fontSize: 16 }}>/100</Text>
            </Text>
          </View>
          {score.dimensions.map((d) => (
            <View key={d.label} style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '600', fontSize: 12 }}>
                  {d.label}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ fontSize: 12 }}>
                  {d.score}/5
                </Text>
              </View>
              <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ fontSize: 11 }}>
                Saw: {d.saw}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ fontSize: 11 }}>
                Push: {d.push}
              </Text>
            </View>
          ))}
          {score.nextAction && (
            <View
              style={{
                marginTop: space.xs,
                padding: space.sm,
                borderRadius: layout.radius.control,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ letterSpacing: 0.6, fontWeight: '700', fontSize: 10 }}>
                NEXT
              </Text>
              <Text color="#FFFFFF" style={{ fontSize: 13, lineHeight: 20, marginTop: 2 }}>
                {score.nextAction}
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Schedule tab — block time on the user's calendar via .ics or Google.
// ---------------------------------------------------------------------------

function ScheduleTab({ task }: { task: Task }) {
  const { colors } = useTheme();
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMin, setDurationMin] = useState(() => {
    const m = /(\d+)\s*min/i.exec(task.effort ?? '');
    return m ? Number(m[1]) : 60;
  });
  const [didDownload, setDidDownload] = useState(false);

  const onDownload = () => {
    const ok = downloadIcs({
      title: task.title,
      description: task.why ?? '',
      startsAt: when,
      durationMin,
    });
    setDidDownload(ok);
  };

  const gcalUrl = googleCalendarUrl({
    title: task.title,
    description: task.why ?? '',
    startsAt: when,
    durationMin,
  });

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Text variant="h3" style={{ fontSize: 18 }}>
          Block the time
        </Text>
        <Text variant="caption" soft>
          Unscheduled improvement doesn't happen. Pick a time, get an
          .ics for any calendar, or open Google Calendar pre-filled.
        </Text>
      </View>

      <View style={{ gap: space.xs }}>
        <Text variant="caption" soft style={{ letterSpacing: 0.5, fontSize: 11, fontWeight: '600' }}>
          WHEN
        </Text>
        <TextInput
          value={when}
          onChangeText={setWhen}
          placeholder="YYYY-MM-DDTHH:mm"
          placeholderTextColor={colors.inkSoft}
          style={{
            borderColor: colors.hairline,
            borderWidth: 1,
            borderRadius: layout.radius.control,
            padding: space.md,
            color: colors.ink,
            backgroundColor: colors.canvas,
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
          }}
        />
        <Text variant="caption" soft style={{ fontSize: 11 }}>
          Format: 2026-05-28T09:00
        </Text>
      </View>

      <View style={{ gap: space.xs }}>
        <Text variant="caption" soft style={{ letterSpacing: 0.5, fontSize: 11, fontWeight: '600' }}>
          DURATION (MINUTES)
        </Text>
        <TextInput
          value={String(durationMin)}
          onChangeText={(t) => setDurationMin(Number(t) || 0)}
          keyboardType="numeric"
          style={{
            borderColor: colors.hairline,
            borderWidth: 1,
            borderRadius: layout.radius.control,
            padding: space.md,
            color: colors.ink,
            backgroundColor: colors.canvas,
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
          }}
        />
      </View>

      <Button label={didDownload ? 'Downloaded' : 'Download .ics'} onPress={onDownload} />
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          if (typeof window !== 'undefined') window.open(gcalUrl, '_blank', 'noopener');
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: space.sm,
        }}
      >
        <ExternalLink size={14} color={colors.accent} strokeWidth={1.75} />
        <Text variant="caption" color={colors.accent} style={{ fontWeight: '600' }}>
          Open in Google Calendar
        </Text>
      </Pressable>
    </Card>
  );
}
