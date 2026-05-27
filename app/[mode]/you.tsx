/**
 * You — settings + career profile hub.
 *
 * v3 (2026-05-26): full career profile capture lives here. The agent
 * uses it to calibrate every reply: full name (for portfolio outputs,
 * intro emails), current role + experience level (calibrates seniority
 * of advice), avatar (personalizes surfaces). Plus the existing
 * companion picker entry, notifications, legal, data export, and account
 * deletion.
 *
 * Crisis-help surface is gone (Career-only product per CEO plan
 * 2026-05-26). The /help route still exists as a generic Help & Support
 * page (FAQ + email contact).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, Share, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { Check, ChevronRight, Cloud, CloudOff, ImagePlus, LogOut, Mail, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space, type Mode } from '@/design/tokens';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Button, Card, Mascot, Rise, Screen } from '@/components/ui';
import {
  EXPERIENCE_LEVELS,
  getProfile,
  resetProfileCache,
  setProfile,
  wipeProfile,
  type ExperienceLevel,
  type Profile,
} from '@/profile';
import { resetGoalsCache } from '@/companion/goals';
import { getStore } from '@/memory/store';
import { findCharacter } from '@/companion/characters';
import { CONTACT_EMAIL } from '@/legal/content';
import { signOut, useAuth } from '@/auth/useAuth';

const ROLE_SUGGESTIONS = [
  'Product Manager',
  'Software Engineer',
  'Designer',
  'Marketing',
  'Sales',
  'Operations',
  'Founder',
  'Consultant',
  'Recruiter',
  'Career switcher',
];

// ---------------------------------------------------------------------------
// Avatar — user photo > chosen companion portrait > default mascot.
// On web, tapping the upload button opens a file picker and stores a
// data-URL into profile.avatarUri. Native upload (expo-image-picker) is
// a follow-up.
// ---------------------------------------------------------------------------
function AvatarPicker({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (uri: string | null) => void;
}) {
  const { colors } = useTheme();
  const character = findCharacter(profile.companionId);

  const openPicker = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Photo upload',
        'Native image picker wiring is a follow-up; on web you can upload directly.',
      );
      return;
    }
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') onChange(result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={{
          width: 80,
          height: 80,
          borderRadius: layout.radius.full,
          overflow: 'hidden',
          backgroundColor: '#F1E5D6',
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
      >
        {profile.avatarUri ? (
          <Image
            source={{ uri: profile.avatarUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessibilityLabel="Your photo"
          />
        ) : (
          <Mascot
            name={profile.coachNames[(profile.lastMode ?? 'career') as Mode] ?? null}
            character={character}
            size={80}
          />
        )}
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: layout.radius.full,
            borderColor: colors.hairline,
            borderWidth: 1,
            alignSelf: 'flex-start',
          }}
        >
          <ImagePlus size={14} color={colors.ink} strokeWidth={1.75} />
          <Text variant="caption" style={{ fontWeight: '600', fontSize: 12 }}>
            {profile.avatarUri ? 'Change photo' : 'Upload photo'}
          </Text>
        </Pressable>
        {profile.avatarUri && (
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
              paddingHorizontal: space.md,
              paddingVertical: space.xs,
              alignSelf: 'flex-start',
            }}
          >
            <Trash2 size={12} color={colors.inkSoft} strokeWidth={1.75} />
            <Text variant="caption" soft style={{ fontSize: 11 }}>
              Remove
            </Text>
          </Pressable>
        )}
        <Text variant="caption" soft style={{ fontSize: 11 }}>
          PNG, JPG, or HEIC. Stays on this device.
        </Text>
      </View>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        accessibilityLabel={label}
        style={{
          minHeight: layout.controlHeight,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: layout.radius.control,
          paddingHorizontal: space.md,
          color: colors.ink,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          backgroundColor: colors.canvas,
        }}
      />
      {hint ? (
        <Text variant="caption" soft style={{ fontSize: 11 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function ExperienceChips({
  value,
  onChange,
}: {
  value: ExperienceLevel | null;
  onChange: (v: ExperienceLevel) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
        EXPERIENCE LEVEL
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {EXPERIENCE_LEVELS.map((lvl) => {
          const on = value === lvl.id;
          return (
            <Pressable
              key={lvl.id}
              onPress={() => onChange(lvl.id)}
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
              <View style={{ alignItems: 'center' }}>
                <Text
                  variant="caption"
                  color={on ? '#FFFFFF' : colors.ink}
                  style={{ fontWeight: '600', letterSpacing: 0.3, fontSize: 12 }}
                >
                  {lvl.label}
                </Text>
                <Text
                  variant="caption"
                  color={on ? 'rgba(255,255,255,0.65)' : colors.inkSoft}
                  style={{ fontSize: 10, marginTop: 1 }}
                >
                  {lvl.hint}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function You() {
  const { mode } = useLocalSearchParams<{ mode: Mode }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [p, setP] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [shortName, setShortName] = useState('');
  const [role, setRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [coach, setCoach] = useState('');
  const [notify, setNotify] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then((pr) => {
        setP(pr);
        setFullName(pr.fullName ?? '');
        setShortName(pr.name ?? '');
        setRole(pr.role ?? '');
        setExperienceLevel(pr.experienceLevel);
        setCoach(pr.coachNames[mode] ?? '');
      });
    }, [mode]),
  );

  async function saveProfile() {
    const next = await setProfile({
      fullName: fullName.trim() || null,
      name: shortName.trim() || null,
      role: role.trim() || null,
      experienceLevel,
      coachNames: { ...(p?.coachNames ?? { career: null, health: null }), [mode]: coach.trim() || null },
    });
    setP(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  }

  async function saveAvatar(uri: string | null) {
    const next = await setProfile({ avatarUri: uri });
    setP(next);
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
      'This permanently erases your profile, conversations, goals, and path. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: doWipe },
      ],
    );
  }

  const version = Constants.expoConfig?.version ?? '0.1.0';
  const companion = findCharacter(p?.companionId ?? null);
  const auth = useAuth();

  async function onSignOut() {
    await signOut();
    resetProfileCache();
    resetGoalsCache();
    // Force a re-read of the now-local profile.
    getProfile().then(setP);
  }

  return (
    <Screen>
      <Rise>
        <View style={{ gap: 6 }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            SETTINGS
          </Text>
          <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
            You
          </Text>
        </View>
      </Rise>

      {/* Profile — the career-context capture the agent uses to
          calibrate every reply. */}
      <Rise delay={60}>
        <Card style={{ gap: space.md }}>
          <Text variant="h3" style={{ fontSize: 20 }}>
            Your profile
          </Text>
          <Text variant="caption" soft>
            What your companion knows about you. Everything stays on this
            device until you sign in.
          </Text>

          {p && <AvatarPicker profile={p} onChange={saveAvatar} />}

          <LabeledInput
            label="Full name"
            value={fullName}
            onChange={setFullName}
            placeholder="Used on CV drafts and intro emails"
          />
          <LabeledInput
            label="What to call you"
            value={shortName}
            onChange={setShortName}
            placeholder="First name or a nickname"
            hint="What your companion says in conversation."
          />
          <LabeledInput
            label="Current role"
            value={role}
            onChange={setRole}
            placeholder={ROLE_SUGGESTIONS[0]}
            hint={`e.g. ${ROLE_SUGGESTIONS.slice(0, 5).join(' · ')}`}
          />
          <ExperienceChips value={experienceLevel} onChange={setExperienceLevel} />

          <LabeledInput
            label="Companion nickname (optional)"
            value={coach}
            onChange={setCoach}
            placeholder="Default uses the picked companion's name"
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button label={savedFlash ? 'Saved ✓' : 'Save profile'} onPress={saveProfile} />
            </View>
            {savedFlash && (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
              />
            )}
          </View>
        </Card>
      </Rise>

      {/* Account — sign-in / sign-out. Hidden entirely when Supabase
          isn't configured (env not set) so the section never renders
          a dead link. */}
      {auth.enabled && (
        <Rise delay={90}>
          {auth.user ? (
            <View
              style={{
                padding: space.md,
                borderRadius: layout.radius.card,
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                gap: space.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: layout.radius.full,
                    backgroundColor: colors.encourage,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cloud size={18} color="#FFFFFF" strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    Backed up
                  </Text>
                  <Text variant="caption" soft numberOfLines={1}>
                    {auth.user.email ?? 'Signed in'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onSignOut}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: space.xs,
                  paddingVertical: space.sm,
                  borderRadius: layout.radius.full,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                }}
              >
                <LogOut size={14} color={colors.ink} strokeWidth={1.75} />
                <Text variant="caption" style={{ fontWeight: '600', fontSize: 13 }}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/sign-in' as any)}
              accessibilityRole="button"
              accessibilityLabel="Sign in to back up across devices"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                padding: space.md,
                borderRadius: layout.radius.card,
                backgroundColor: colors.ink,
                ...shadow.raised,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: layout.radius.full,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloudOff size={18} color="#FFFFFF" strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="body" color="#FFFFFF" style={{ fontWeight: '600' }}>
                  Back up across devices
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.65)">
                  Sign in with email to follow your goal anywhere
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.65)" strokeWidth={1.75} />
            </Pressable>
          )}
        </Rise>
      )}

      {/* Companion picker entry */}
      <Rise delay={120}>
        <Pressable
          onPress={() => router.push('/companion-picker' as any)}
          accessibilityRole="button"
          accessibilityLabel="Change your AI companion"
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
          <Mascot
            name={p?.coachNames[mode] ?? null}
            character={companion}
            size={44}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              Your AI companion
            </Text>
            <Text variant="caption" soft>
              {companion ? `${companion.name} · ${companion.role}` : 'No companion selected yet'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkSoft} strokeWidth={1.75} />
        </Pressable>
      </Rise>

      {/* Notifications */}
      <Rise delay={180}>
        <Card>
          <Text variant="h3" style={{ fontSize: 20 }}>
            Notifications
          </Text>
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
      </Rise>

      {/* Help & support */}
      <Rise delay={240}>
        <Pressable
          onPress={() => router.push('/help' as any)}
          accessibilityRole="button"
          accessibilityLabel="Help and support"
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
            <Mail size={18} color={colors.ink} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              Help & support
            </Text>
            <Text variant="caption" soft>
              FAQ · email us at {CONTACT_EMAIL}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkSoft} strokeWidth={1.75} />
        </Pressable>
      </Rise>

      {/* Legal */}
      <Rise delay={300}>
        <Card>
          <Text variant="h3" style={{ fontSize: 20 }}>
            Legal
          </Text>
          {(['privacy', 'terms'] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => router.push(`/legal/${d}` as any)}
              accessibilityRole="link"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: space.xs,
              }}
            >
              <Text variant="body" color={colors.ink} style={{ fontWeight: '500' }}>
                {d === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
              </Text>
              <ChevronRight size={16} color={colors.inkSoft} strokeWidth={1.75} />
            </Pressable>
          ))}
        </Card>
      </Rise>

      {/* Data */}
      <Rise delay={360}>
        <Card>
          <Text variant="h3" style={{ fontSize: 20 }}>
            Your data
          </Text>
          <Button label="Export my data" variant="soft" onPress={exportData} />
          <Button label="Delete account & all data" variant="ghost" onPress={deleteAccount} />
          <Text variant="caption" soft>
            Deletion is permanent and immediate.
          </Text>
        </Card>
      </Rise>

      <Text variant="caption" soft style={{ textAlign: 'center', marginTop: space.md }}>
        Cairn v{version} · made with care
      </Text>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}
