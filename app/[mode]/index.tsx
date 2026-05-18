/**
 * Companion tab ("You & me") — home. Warm and alive: the companion has a
 * presence and reaches out first. Nameless by default ("your companion")
 * until the user names it in You. Crisis stays calm and chromeless. Help is
 * always one tap away from the header (store-review + ethics).
 */
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space, type Mode } from '@/design/tokens';
import {
  Button,
  CompanionBubble,
  CrisisInline,
  EncouragementChip,
  Mascot,
  Screen,
} from '@/components/ui';
import { coachLabel, getProfile, resolveCoachName, setProfile } from '@/profile';
import { evaluateRitual, openingHint } from '@/companion/ritual';
import { runTurn } from '@/companion/turn';
import { addCommitment } from '@/companion/coaching';
import { hotlinesFor, crisisExposureAllowed } from '@/safety/crisis';
import { healthDomainAvailable } from '@/safety/healthGuardrails';

interface Line {
  who: 'companion' | 'you';
  text: string;
  crisis?: string | null;
}

export default function Companion() {
  const { mode } = useLocalSearchParams<{ mode: Mode }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('your companion');
  const [praise, setPraise] = useState<string | null>(null);
  const userName = useRef<string | null>(null);
  const region = useRef<'NG' | 'US' | 'unknown'>('unknown');
  const started = useRef(false);

  const healthBlocked = mode === 'health' && !healthDomainAvailable().ok;

  const say = useCallback(
    async (userText: string) => {
      setBusy(true);
      setLines((l) => [...l, { who: 'you', text: userText }]);
      const res = await runTurn(mode, userText, userName.current);
      setLines((l) => [...l, { who: 'companion', text: res.reply, crisis: res.crisisInline }]);
      setBusy(false);
    },
    [mode],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await setProfile({ lastMode: mode });
      const p = await getProfile();
      userName.current = p.name;
      region.current = p.region;
      setCoachName(resolveCoachName(p, mode));
      setDisplayName(coachLabel(p, mode));
      if (healthBlocked) return;
      const decision = await evaluateRitual(mode);
      if (decision.fire) {
        setBusy(true);
        const res = await runTurn(mode, openingHint(decision.posture), p.name);
        setLines([{ who: 'companion', text: res.reply, crisis: res.crisisInline }]);
        setBusy(false);
      } else {
        setLines([
          {
            who: 'companion',
            text:
              decision.posture === 'waiting'
                ? "I'm here whenever you want me. No streak to keep, nothing owed — just glad you're back."
                : 'Good to see you again.',
          },
        ]);
      }
    })();
  }, [mode, healthBlocked]);

  if (healthBlocked) {
    return (
      <Screen>
        <Text variant="h2">Health is opening soon</Text>
        <Text variant="voice" soft>
          {healthDomainAvailable().notice}
        </Text>
        <Button label="Back to Career" onPress={() => router.replace('/career' as any)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Mascot name={coachName} />
          <View>
            <Text variant="h3">{coachName ?? 'Your companion'}</Text>
            <Text variant="caption" soft>
              {mode === 'career' ? 'career' : 'health'} · here with you
            </Text>
          </View>
        </View>
        <Link href={'/help' as any} accessibilityLabel="Get help now">
          <Text variant="label" color={colors.crisis}>
            Help
          </Text>
        </Link>
      </View>

      {praise && <EncouragementChip text={praise} />}

      <View style={{ gap: space.lg, flex: 1 }}>
        {lines.map((ln, i) =>
          ln.who === 'companion' ? (
            <View key={i} style={{ gap: space.sm }}>
              <CompanionBubble name={coachName}>{ln.text}</CompanionBubble>
              {ln.crisis != null && (
                <CrisisInline
                  message={crisisExposureAllowed() ? (ln.crisis as string) : ''}
                  preReview={!crisisExposureAllowed()}
                  hotlines={hotlinesFor(region.current)}
                />
              )}
            </View>
          ) : (
            <View
              key={i}
              style={{
                alignSelf: 'flex-end',
                maxWidth: '85%',
                backgroundColor: colors.accent,
                borderRadius: layout.radius.card,
                borderTopRightRadius: 6,
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
              }}
            >
              <Text variant="body" color="#FFFFFF">
                {ln.text}
              </Text>
            </View>
          ),
        )}
        {busy && (
          <Text variant="caption" soft>
            {displayName} is here, thinking with you…
          </Text>
        )}
      </View>

      <View style={{ gap: space.sm }}>
        {mode === 'career' && (
          <Button
            label="I'll commit to this"
            variant="soft"
            onPress={async () => {
              if (!input.trim()) return;
              await addCommitment('career', input.trim());
              setInput('');
              setPraise(null);
              setLines((l) => [
                ...l,
                { who: 'companion', text: "Logged. I'll hold you to that — gently, but I will. 🌱" },
              ]);
            }}
          />
        )}
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Talk to ${displayName}…`}
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="Message your companion"
            multiline
            style={{
              flex: 1,
              minHeight: layout.controlHeight,
              maxHeight: 140,
              borderWidth: 1.5,
              borderColor: colors.hairline,
              borderRadius: layout.radius.control,
              paddingHorizontal: space.md,
              paddingTop: space.sm,
              color: colors.ink,
              fontFamily: 'Nunito_500Medium',
              fontSize: 17,
              backgroundColor: colors.card,
            }}
          />
          <Button
            label="Send"
            busy={busy}
            onPress={() => {
              const t = input.trim();
              if (!t) return;
              setInput('');
              say(t);
            }}
            style={{ width: 104 }}
          />
        </View>
      </View>
    </Screen>
  );
}
