/**
 * Get-started — the post-walkthrough CTA screen.
 *
 * Three branches: Sign up (primary), Sign in, Continue as guest. Sits
 * between the welcome carousel and any auth/profile work. Holds no
 * consent UI itself — sign-up/sign-in show an explicit checkbox, and
 * the guest button's small disclaimer text acts as implicit consent
 * (standard consumer-app pattern).
 *
 * "Continue as guest" sets `consentAcceptedAt` + `ageConfirmed` locally
 * (the click + disclaimer are the acceptance) and routes straight to
 * /companion-picker. No fields collected for guests — name/role go in
 * the You tab later.
 */
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ArrowRight, LogIn, UserCircle2, UserPlus2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { CairnMark } from '@/components/CairnMark';
import { layout, motion, shadow, space } from '@/design/tokens';
import { Screen } from '@/components/ui';
import { setProfile } from '@/profile';

function PrimaryButton({
  label,
  Icon,
  onPress,
  bg,
  fg,
  delay = 0,
}: {
  label: string;
  Icon: typeof UserPlus2;
  onPress: () => void;
  bg: string;
  fg: string;
  delay?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: motion.duration.medium,
        delay,
        easing: Easing.out(Easing.quad),
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          backgroundColor: bg,
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          borderRadius: layout.radius.full,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          minHeight: 56,
          ...shadow.raised,
        }}
      >
        <Icon size={18} color={fg} strokeWidth={2} />
        <Text variant="button" color={fg}>
          {label}
        </Text>
        <ArrowRight size={16} color={fg} strokeWidth={2.25} style={{ marginLeft: 4 }} />
      </Pressable>
    </MotiView>
  );
}

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();

  const continueAsGuest = async () => {
    await setProfile({
      ageConfirmed: true,
      consentAcceptedAt: new Date().toISOString(),
    });
    router.replace('/companion-picker?next=/career' as any);
  };

  return (
    <Screen tabSafe={false}>
      <View
        style={{
          paddingTop: space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <CairnMark size={22} color={colors.ink} />
        <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 26, color: colors.ink }}>
          Cairn
        </Text>
      </View>

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
          ONE LAST THING
        </Text>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 42,
            lineHeight: 46,
            color: colors.ink,
            letterSpacing: -0.8,
          }}
        >
          Save your progress —{' '}
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular_Italic',
              color: colors.accent,
              fontSize: 42,
              letterSpacing: -0.8,
            }}
          >
            or try it first.
          </Text>
        </Text>
        <Text variant="lede" soft style={{ lineHeight: 24, marginTop: 4 }}>
          An account syncs your goal and path across devices and lets your
          companion remember context between sessions. Guest mode keeps
          everything on this device — no email, no sign-up, you can sign
          in later from the You tab.
        </Text>
      </View>

      {/* What you'll set up next — micro-roadmap so the user knows the
          three steps ahead and doesn't feel like sign-up is a black box. */}
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.hairline,
          borderWidth: 1,
          borderRadius: layout.radius.card,
          padding: space.md,
          gap: space.sm,
          ...shadow.rest,
        }}
      >
        <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
          NEXT, IN UNDER 90 SECONDS
        </Text>
        {[
          'Your role + experience — so the companion calibrates advice',
          'Pick your companion — eight specialists, each a different lens',
          'State your first goal — and we build the path together',
        ].map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
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
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '700' }}>
                {i + 1}
              </Text>
            </View>
            <Text variant="body" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <PrimaryButton
          label="Create an account"
          Icon={UserPlus2}
          onPress={() => router.push('/sign-up' as any)}
          bg={colors.accent}
          fg="#FFFFFF"
        />
        <PrimaryButton
          label="Sign in"
          Icon={LogIn}
          onPress={() => router.push('/sign-in' as any)}
          bg={colors.ink}
          fg="#FFFFFF"
          delay={60}
        />
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: motion.duration.medium,
            delay: 120,
            easing: Easing.out(Easing.quad),
          }}
        >
          <Pressable
            onPress={continueAsGuest}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
            style={{
              backgroundColor: 'transparent',
              paddingVertical: space.md,
              borderRadius: layout.radius.full,
              borderColor: colors.hairline,
              borderWidth: 1.25,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
              minHeight: 56,
            }}
          >
            <UserCircle2 size={18} color={colors.ink} strokeWidth={1.75} />
            <Text variant="button" color={colors.ink}>
              Continue as guest
            </Text>
          </Pressable>
        </MotiView>
      </View>

      {/* Implicit-consent disclaimer (Guest path). Sign-up + sign-in
          screens carry their own explicit checkboxes for the same
          legal acceptance. */}
      <Text
        variant="caption"
        soft
        style={{ textAlign: 'center', fontSize: 11, lineHeight: 16, paddingHorizontal: space.sm }}
      >
        By continuing you confirm you're 17 or older and agree to the{' '}
        <Text
          variant="caption"
          color={colors.accent}
          style={{ fontSize: 11, fontWeight: '600' }}
          onPress={() => router.push('/legal/terms' as any)}
        >
          Terms
        </Text>{' '}
        and{' '}
        <Text
          variant="caption"
          color={colors.accent}
          style={{ fontSize: 11, fontWeight: '600' }}
          onPress={() => router.push('/legal/privacy' as any)}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </Screen>
  );
}

export default function GetStarted() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
