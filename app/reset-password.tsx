/**
 * Reset password — landing page from the password-reset email link.
 *
 * Supabase's PKCE flow drops a `code=...` query param on this URL when
 * the user clicks the email link; the SDK auto-exchanges it for a
 * temporary recovery session (because detectSessionInUrl is true in
 * src/data/supabase.ts). With that session active, calling
 * `updateUser({ password })` works.
 *
 * Two safeguards:
 *   1. Wait until useAuth reports a user before allowing submit — if
 *      the user opened this URL directly without a code, we show a
 *      "link expired / invalid" message instead of a broken form.
 *   2. Require matching password + confirm to catch typos before
 *      they're saved.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, shadow, space } from '@/design/tokens';
import { Check } from 'lucide-react-native';
import { Rise, Screen } from '@/components/ui';
import { AuthErrorBanner, AuthSubmit, PasswordField } from '@/components/auth';
import { updatePassword, useAuth } from '@/auth/useAuth';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After a successful reset + setDone, give the user a tap to continue;
  // the new session is already active so we can land them straight in
  // the app, or send them to /sign-in if they prefer.
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => router.replace('/career' as any), 2000);
      return () => clearTimeout(t);
    }
  }, [done, router]);

  const validate = (): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords don\'t match.';
    return null;
  };

  async function onSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await updatePassword(password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  if (!loading && !user) {
    return (
      <Screen tabSafe={false}>
        <Rise>
          <View style={{ gap: 6, marginTop: space.lg }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              RESET PASSWORD
            </Text>
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 36, lineHeight: 40, color: colors.ink }}>
              This link is{' '}
              <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.accent, fontSize: 36 }}>
                expired or invalid.
              </Text>
            </Text>
            <Text variant="lede" soft style={{ marginTop: 4 }}>
              Reset links expire after an hour. Request a new one from the
              forgot-password page and try again.
            </Text>
          </View>
        </Rise>
        <Rise delay={60}>
          <AuthSubmit label="Request a new link" onPress={() => router.replace('/forgot-password' as any)} />
        </Rise>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen tabSafe={false}>
        <Rise>
          <View
            style={{
              backgroundColor: colors.ink,
              borderRadius: layout.radius.card,
              padding: space.lg,
              gap: space.sm,
              marginTop: space.lg,
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
                PASSWORD UPDATED
              </Text>
            </View>
            <Text
              color="#FFFFFF"
              style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, lineHeight: 26 }}
            >
              You're back in.
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)">
              Taking you to your path now.
            </Text>
          </View>
        </Rise>
      </Screen>
    );
  }

  return (
    <Screen tabSafe={false}>
      <Rise>
        <View style={{ gap: 6, marginTop: space.lg }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            RESET PASSWORD
          </Text>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 36, lineHeight: 40, color: colors.ink }}>
            Set a{' '}
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.accent, fontSize: 36 }}>
              new password.
            </Text>
          </Text>
          <Text variant="lede" soft style={{ marginTop: 4 }}>
            Make it long. Mix in something unguessable.
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <View style={{ gap: space.md }}>
          <PasswordField
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Same again"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <AuthErrorBanner message={error} />
          <AuthSubmit
            label="Update password"
            loadingLabel="Updating…"
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </Rise>
    </Screen>
  );
}

export default function ResetPassword() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
