/**
 * Shared auth-screen primitives.
 *
 * Pulled out of sign-up/sign-in/forgot-password/reset-password so the
 * shape of an input row, a primary submit button, an error banner,
 * and the consent checkbox stays identical across all four screens.
 * One source of truth for spacing, type, and focus behavior.
 */
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';

export function AuthField({
  label,
  hint,
  error,
  ...rest
}: {
  label: string;
  hint?: string;
  error?: string | null;
} & TextInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text
        variant="caption"
        soft
        style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 11 }}
      >
        {label.toUpperCase()}
      </Text>
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={colors.inkSoft}
        style={[
          {
            minHeight: layout.controlHeight,
            borderRadius: layout.radius.control,
            borderColor: error ? colors.error : focused ? colors.ink : colors.hairline,
            borderWidth: focused || error ? 1.5 : 1,
            paddingHorizontal: space.md,
            color: colors.ink,
            fontFamily: 'Inter_400Regular',
            fontSize: 16,
            backgroundColor: colors.canvas,
            // outlineWidth is web-only; React Native types don't include
            // it but react-native-web passes it through. Cast keeps TS
            // happy without an unused @ts-expect-error.
            ...({ outlineWidth: 0 } as object),
          },
          rest.style as object,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.error} style={{ fontSize: 12 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" soft style={{ fontSize: 12 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Password field with eye toggle for show/hide. Pair with the same
 *  validation + error wiring as AuthField. */
export function PasswordField({
  label,
  hint,
  error,
  value,
  onChangeText,
  placeholder,
  autoComplete = 'current-password',
  textContentType = 'password',
}: {
  label: string;
  hint?: string;
  error?: string | null;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
}) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text
        variant="caption"
        soft
        style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 11 }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: layout.radius.control,
          borderColor: error ? colors.error : focused ? colors.ink : colors.hairline,
          borderWidth: focused || error ? 1.5 : 1,
          backgroundColor: colors.canvas,
          paddingRight: space.xs,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSoft}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          accessibilityLabel={label}
          style={{
            flex: 1,
            minHeight: layout.controlHeight,
            paddingHorizontal: space.md,
            color: colors.ink,
            fontFamily: 'Inter_400Regular',
            fontSize: 16,
            // @ts-expect-error web-only outline reset
            outlineWidth: 0,
          }}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {visible ? (
            <EyeOff size={18} color={colors.inkSoft} strokeWidth={1.75} />
          ) : (
            <Eye size={18} color={colors.inkSoft} strokeWidth={1.75} />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text variant="caption" color={colors.error} style={{ fontSize: 12 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" soft style={{ fontSize: 12 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Primary action — big rounded pill. Loading/disabled handled. */
export function AuthSubmit({
  label,
  loadingLabel,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const off = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        backgroundColor: colors.accent,
        paddingVertical: space.md,
        borderRadius: layout.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
        opacity: off ? 0.55 : 1,
        ...shadow.raised,
      }}
    >
      <Text variant="button" color="#FFFFFF">
        {loading ? loadingLabel ?? label : label}
      </Text>
    </Pressable>
  );
}

/** Inline error banner. Hidden when message is empty. */
export function AuthErrorBanner({ message }: { message: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <MotiView
      from={{ opacity: 0, translateY: -4 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
      style={{
        backgroundColor: '#FFF1EE',
        borderColor: colors.error,
        borderWidth: 1,
        borderRadius: layout.radius.control,
        padding: space.sm,
      }}
    >
      <Text variant="caption" color={colors.error} style={{ fontSize: 13 }}>
        {message}
      </Text>
    </MotiView>
  );
}

/** Consent checkbox row — used on sign-up + sign-in.
 *  Covers the 17+ age gate AND Terms/Privacy in one assertion. */
export function ConsentCheckbox({
  checked,
  onToggle,
  onLinkPress,
  minAge = 17,
}: {
  checked: boolean;
  onToggle: () => void;
  onLinkPress: (which: 'terms' | 'privacy') => void;
  minAge?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="I am 17 or older and accept Terms and Privacy Policy"
      onPress={onToggle}
      style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}
    >
      <MotiView
        animate={{
          backgroundColor: checked ? colors.ink : 'transparent',
          borderColor: checked ? colors.ink : colors.hairline,
        }}
        transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.25,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {checked && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
      </MotiView>
      <Text variant="caption" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
        I'm {minAge} or older and accept the{' '}
        <Text
          variant="caption"
          color={colors.accent}
          style={{ fontSize: 13, fontWeight: '600' }}
          onPress={(e) => {
            e.stopPropagation?.();
            onLinkPress('terms');
          }}
        >
          Terms
        </Text>{' '}
        and{' '}
        <Text
          variant="caption"
          color={colors.accent}
          style={{ fontSize: 13, fontWeight: '600' }}
          onPress={(e) => {
            e.stopPropagation?.();
            onLinkPress('privacy');
          }}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </Pressable>
  );
}
