/**
 * Sign-in — magic-link flow.
 *
 * The user enters an email; Supabase sends a one-time link; clicking
 * the link redirects back to this same page with a `?code=...` query
 * param, which the SDK auto-exchanges for a session (because of the
 * detectSessionInUrl flag in src/data/supabase.ts). The auth-state
 * listener in useAuth then fires; we redirect to /career.
 *
 * The page is fully optional in the product — guest mode is always
 * valid. We only land here from the You-tab "Back up across devices"
 * CTA, or directly via a magic-link redirect.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, TextInput, View } from 'react-native';
import { ArrowLeft, Check, Mail } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, shadow, space } from '@/design/tokens';
import { Rise, Screen } from '@/components/ui';
import { sendMagicLink, useAuth } from '@/auth/useAuth';
import { supabaseEnabled } from '@/data/supabase';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading, enabled } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we land here already signed in (e.g. magic-link redirect just
  // resolved), drop the user into the app.
  useEffect(() => {
    if (!loading && user) router.replace('/career' as any);
  }, [loading, user, router]);

  async function onSend() {
    const e = email.trim();
    if (!e || !/\S+@\S+\.\S+/.test(e)) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await sendMagicLink(e);
    setBusy(false);
    if (res.ok) {
      setSent(true);
    } else {
      setError(res.error ?? 'Could not send the email. Try again.');
    }
  }

  if (!enabled) {
    return (
      <Screen tabSafe={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.back()}
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
        <Rise>
          <View style={{ gap: 6, marginTop: space.sm }}>
            <Text variant="display" style={{ fontSize: 32 }}>
              Sign-in isn't configured.
            </Text>
            <Text variant="body" soft style={{ marginTop: 4 }}>
              Cairn works fully without an account — your data is on this device.
              Sign-in is only needed for cross-device backup, which the operator
              hasn't enabled on this build yet.
            </Text>
          </View>
        </Rise>
      </Screen>
    );
  }

  return (
    <Screen tabSafe={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => router.back()}
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

      <Rise>
        <View style={{ gap: 6, marginTop: space.sm }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            BACK UP ACROSS DEVICES
          </Text>
          <Text variant="display" style={{ fontSize: 38, lineHeight: 42 }}>
            Sign in with{' '}
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular_Italic',
                color: colors.accent,
                fontSize: 38,
              }}
            >
              your email.
            </Text>
          </Text>
          <Text variant="lede" soft style={{ marginTop: 4 }}>
            No password. We send you a one-tap link. Once you sign in, your goal
            and profile move from this device to your account — and follow you
            on any device you sign in from.
          </Text>
        </View>
      </Rise>

      {sent ? (
        <Rise delay={60}>
          <View
            style={{
              backgroundColor: colors.ink,
              borderRadius: layout.radius.card,
              padding: space.lg,
              gap: space.sm,
              ...shadow.raised,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Check size={16} color={colors.encourage} strokeWidth={2.25} />
              <Text
                variant="caption"
                color={colors.encourage}
                style={{ letterSpacing: 0.5, fontWeight: '700', fontSize: 11 }}
              >
                LINK SENT
              </Text>
            </View>
            <Text
              color="#FFFFFF"
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 24,
                lineHeight: 28,
              }}
            >
              Check {email}.
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)">
              Tap the link in the email to finish signing in. You can close this
              page; you'll land back here automatically.
            </Text>
            <Pressable
              onPress={() => {
                setSent(false);
                setEmail('');
              }}
              accessibilityRole="button"
              style={{
                alignSelf: 'flex-start',
                marginTop: space.xs,
                paddingHorizontal: space.md,
                paddingVertical: space.xs,
                borderRadius: layout.radius.full,
                backgroundColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '600', fontSize: 12 }}>
                Use a different email
              </Text>
            </Pressable>
          </View>
        </Rise>
      ) : (
        <Rise delay={60}>
          <View style={{ gap: space.sm }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
              YOUR EMAIL
            </Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkSoft}
              accessibilityLabel="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
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
            {error ? (
              <Text variant="caption" color={colors.error} style={{ fontSize: 12 }}>
                {error}
              </Text>
            ) : null}
            <Pressable
              onPress={onSend}
              disabled={busy || !email.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send magic link"
              style={{
                backgroundColor: colors.accent,
                paddingVertical: space.md,
                borderRadius: layout.radius.full,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                minHeight: 52,
                opacity: busy || !email.trim() ? 0.45 : 1,
                ...shadow.raised,
              }}
            >
              <Mail size={16} color="#FFFFFF" strokeWidth={2} />
              <Text variant="button" color="#FFFFFF">
                {busy ? 'Sending…' : 'Email me a link'}
              </Text>
            </Pressable>
            <Text variant="caption" soft style={{ textAlign: 'center', fontSize: 11, marginTop: space.xs }}>
              By signing in you agree to the Terms and Privacy Policy.
            </Text>
          </View>
        </Rise>
      )}
    </Screen>
  );
}

export default function SignIn() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
