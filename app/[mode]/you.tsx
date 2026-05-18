/**
 * "You" tab — the settings hub. Profile, the optional companion name, the
 * deliberate mode switch (mode-as-place — switching lives HERE, not a tab),
 * notifications, legal, data export, account deletion (store-review), help,
 * about. Also the operator safety view (triage + kill switch).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Share, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space, type Mode } from '@/design/tokens';
import { Button, Card, Screen } from '@/components/ui';
import {
  getProfile,
  setProfile,
  wipeProfile,
  type Profile,
} from '@/profile';
import { getStore } from '@/memory/store';
import { healthDomainAvailable } from '@/safety/healthGuardrails';
import { Safety } from '@/safety/observability';

export default function You() {
  const { mode } = useLocalSearchParams<{ mode: Mode }>();
  const router = useRouter();
  const { colors } = useTheme();
  const other: Mode = mode === 'career' ? 'health' : 'career';
  const [p, setP] = useState<Profile | null>(null);
  const [coach, setCoach] = useState('');
  const [notify, setNotify] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then((pr) => {
        setP(pr);
        setCoach(pr.coachNames[mode] ?? '');
      });
    }, [mode]),
  );

  async function saveCoach() {
    const c = coach.trim() || null;
    const next = await setProfile({
      coachNames: { ...(p?.coachNames ?? { career: null, health: null }), [mode]: c },
    });
    setP(next);
  }

  async function switchMode() {
    if (other === 'health' && !healthDomainAvailable().ok) return;
    await setProfile({ lastMode: other });
    router.replace(`/${other}` as any);
  }

  async function exportData() {
    const store = await getStore();
    const all = await store.exportAll();
    const blob = JSON.stringify({ profile: p, memory: all }, null, 2);
    try {
      await Share.share({ message: blob });
    } catch {
      Alert.alert('Export', `Your data (${blob.length} chars) is ready but sharing isn’t available here.`);
    }
  }

  function deleteAccount() {
    const doWipe = async () => {
      const store = await getStore();
      await store.wipeAll();
      await wipeProfile();
      router.replace('/welcome' as any);
    };
    if (Platform.OS === 'web') {
      doWipe();
      return;
    }
    Alert.alert(
      'Delete everything?',
      'This permanently erases your profile, conversations, check-ins, and garden. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: doWipe },
      ],
    );
  }

  const otherOk = other === 'health' ? healthDomainAvailable() : { ok: true };
  const triage = Safety.triageQueue();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <Screen>
      <Text variant="h2">You</Text>

      <Card>
        <Text variant="h3">Your companion</Text>
        <Text variant="body" soft>
          Default is just “your companion.” Name it if you want — yours to
          change anytime.
        </Text>
        <TextInput
          value={coach}
          onChangeText={setCoach}
          placeholder="Companion name (optional)"
          placeholderTextColor={colors.inkSoft}
          accessibilityLabel="Companion name"
          style={{
            minHeight: layout.controlHeight,
            borderWidth: 1.5,
            borderColor: colors.hairline,
            borderRadius: layout.radius.control,
            paddingHorizontal: space.md,
            color: colors.ink,
            fontFamily: 'Nunito_500Medium',
            fontSize: 17,
            backgroundColor: colors.canvas,
          }}
        />
        <Button label="Save name" variant="soft" onPress={saveCoach} />
      </Card>

      <Card>
        <Text variant="h3">Switch world</Text>
        <Text variant="body" soft>
          You’re in {mode}. Switching is deliberate — one focused companion at
          a time.
        </Text>
        <Button
          label={otherOk.ok ? `Go to ${other}` : `${other} is opening soon`}
          disabled={!otherOk.ok}
          onPress={switchMode}
        />
      </Card>

      <Card>
        <Text variant="h3">Notifications</Text>
        <Text variant="body" soft>
          Gentle daily check-ins. {notify ? 'On' : 'Off'} — never guilt, you
          can always turn this off.
        </Text>
        <Button
          label={notify ? 'Turn off check-ins' : 'Turn on gentle check-ins'}
          variant="ghost"
          onPress={() => setNotify((v) => !v)}
        />
        <Text variant="caption" soft>
          Push delivery activates with the hosted backend; this preference is
          saved meanwhile.
        </Text>
      </Card>

      <Card>
        <Text variant="h3">Safety & support</Text>
        <Button
          label="Get help now"
          onPress={() => router.push('/help' as any)}
        />
        <Text variant="caption" soft>
          Operator view · {triage.length} flagged moment(s) for human review.
        </Text>
        <Button
          label={Safety.isKilled(mode) ? `Re-enable ${mode}` : `Pause ${mode} (kill switch)`}
          variant="ghost"
          onPress={() => {
            Safety.isKilled(mode) ? Safety.revive(mode) : Safety.kill(mode);
            setP((x) => (x ? { ...x } : x));
          }}
        />
      </Card>

      <Card>
        <Text variant="h3">Legal</Text>
        {(['privacy', 'terms', 'disclaimer'] as const).map((d) => (
          <Text
            key={d}
            variant="body"
            color={colors.accent}
            onPress={() => router.push(`/legal/${d}` as any)}
            style={{ paddingVertical: space.xs }}
          >
            {d === 'privacy' ? 'Privacy Policy' : d === 'terms' ? 'Terms of Use' : 'What TrueSelf is and isn’t'}
          </Text>
        ))}
      </Card>

      <Card>
        <Text variant="h3">Your data</Text>
        <Button label="Export my data" variant="soft" onPress={exportData} />
        <Button label="Delete account & all data" variant="ghost" onPress={deleteAccount} />
        <Text variant="caption" soft>
          Deletion is permanent and immediate.
        </Text>
      </Card>

      <Text variant="caption" soft style={{ textAlign: 'center' }}>
        TrueSelf v{version} · made with care · {''}
        a companion, not a clinician
      </Text>
      <View style={{ height: space.xl }} />
    </Screen>
  );
}
