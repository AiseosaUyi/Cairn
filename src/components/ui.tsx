/**
 * Shared UI — Mature Consumer (premium editorial sans, single warm accent).
 *
 * The structural work is Inter; the editorial moment is Instrument Serif
 * (companion voice only). Warmth comes from the off-white canvas and
 * terracotta accent, not from rounded letterforms. Flat dignified controls,
 * hairline-bordered cards, eased mount motion via moti. Crisis is the one
 * still, chromeless place — pass `frozen` to motion wrappers there.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { MotiView, useDynamicAnimation } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Check, type LucideIcon } from 'lucide-react-native';
import { useReducedMotion } from '@/design/useReducedMotion';
import { useTheme } from '@/design/theme';
import { layout, motion, shadow, space } from '@/design/tokens';
import { Text } from '@/design/Text';
import { avatarUrl, type Character } from '@/companion/characters';

// ---------------------------------------------------------------------------
// Motion primitive — eased mount lift with optional stagger. Respects
// `useReducedMotion()` and an explicit `frozen` prop (used inside crisis
// surfaces — stillness is the signal, never override that).
// ---------------------------------------------------------------------------
export function Rise({
  children,
  delay = 0,
  lift = motion.liftPx,
  frozen = false,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  lift?: number;
  frozen?: boolean;
  style?: ViewStyle;
}) {
  const reduce = useReducedMotion();
  const skipMotion = frozen || reduce;
  return (
    <MotiView
      from={skipMotion ? { opacity: 1, translateY: 0 } : { opacity: 0, translateY: lift }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: skipMotion ? 0 : motion.duration.medium,
        delay: skipMotion ? 0 : delay,
        easing: Easing.out(Easing.quad),
      }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Screen — page shell. Max content width, generous breath. Optional `frozen`
// for crisis surfaces.
// ---------------------------------------------------------------------------
export function Screen({
  children,
  scroll = true,
  tabSafe = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Leave space at the bottom for the floating tab bar. Default true.
   * Set false on routes outside the [mode] shell (welcome, onboarding). */
  tabSafe?: boolean;
}) {
  const { colors } = useTheme();
  const inner = (
    <View
      style={{
        flex: 1,
        width: '100%',
        maxWidth: layout.maxContentWidth,
        alignSelf: 'center',
        paddingHorizontal: space.lg,
        paddingTop: space.lg,
        gap: space.lg,
      }}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: tabSafe ? 96 : space['3xl'] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingBottom: tabSafe ? 96 : 0 }}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Card — hairline-bordered surface with whisper shadow. Cards earn their
// place — used for grouped meaning.
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
  tone = 'card',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  tone?: 'card' | 'wash';
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'wash' ? colors.washTop : colors.card,
          borderRadius: layout.radius.card,
          borderWidth: tone === 'wash' ? 0 : 1,
          borderColor: colors.hairline,
          padding: space.lg,
          gap: space.sm,
          ...shadow.rest,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Button — flat, dignified, soft scale-press feedback via moti. No slab
// edge (the slab was the single biggest playfulness tell). Min height 52,
// accessible label.
// ---------------------------------------------------------------------------
export function Button({
  label,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'ghost';
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const off = disabled || busy;
  const [pressed, setPressed] = useState(false);

  const primary = variant === 'primary';
  const soft = variant === 'soft';
  const ghost = variant === 'ghost';
  const bg = primary ? colors.accent : soft ? colors.card : 'transparent';
  const fg = primary ? '#FFFFFF' : colors.ink;
  const border = ghost ? colors.hairline : soft ? colors.hairline : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      accessibilityLabel={label}
      onPressIn={() => !off && setPressed(true)}
      onPressOut={() => !off && setPressed(false)}
      onPress={off ? undefined : onPress}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      <MotiView
        animate={{
          scale: pressed && !reduce ? motion.press.scale : 1,
          opacity: pressed && !reduce ? motion.press.opacity : 1,
        }}
        transition={{
          type: 'timing',
          duration: motion.duration.micro,
          easing: Easing.out(Easing.quad),
        }}
        style={{
          minHeight: layout.controlHeight,
          paddingVertical: space.sm,
          paddingHorizontal: space.lg,
          borderRadius: layout.radius.control,
          backgroundColor: bg,
          borderWidth: ghost || soft ? 1.25 : 0,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
          ...(primary ? shadow.rest : null),
        }}
      >
        {busy ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text variant="button" color={fg} style={{ textAlign: 'center' }}>
            {label}
          </Text>
        )}
      </MotiView>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Mascot — the companion's presence avatar. When a Character is selected,
// renders the portrait. Without one, falls back to the editorial diamond
// glyph (named initial or `◆`). Keeps surfaces personalized after the
// user picks a companion in onboarding.
// ---------------------------------------------------------------------------
export function Mascot({
  name,
  character,
  size = 36,
}: {
  name: string | null;
  /** When set, renders the character's portrait instead of the glyph. */
  character?: Character | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const label = character
    ? `${character.name}, ${character.role}`
    : name
    ? `${name}, your companion`
    : 'your companion';

  if (character) {
    return (
      <View
        accessibilityLabel={label}
        style={{
          width: size,
          height: size,
          borderRadius: layout.radius.full,
          overflow: 'hidden',
          backgroundColor: '#F1E5D6',
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
      >
        <Image
          source={{ uri: avatarUrl(character, Math.max(120, size * 2)) }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: layout.radius.full,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="button" color="#FFFFFF" style={{ fontSize: size * 0.42 }}>
        {name ? name.slice(0, 1).toUpperCase() : '◆'}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CompanionBubble — the warm letter. Mascot + voice text, no asymmetric
// chat-tail (chat-app cliché). When a Character is passed, uses their
// avatar. Mount on rise. Frozen inside crisis surfaces.
// ---------------------------------------------------------------------------
export function CompanionBubble({
  name,
  character,
  children,
  delay = 0,
  frozen = false,
}: {
  name: string | null;
  character?: Character | null;
  children: React.ReactNode;
  delay?: number;
  frozen?: boolean;
}) {
  return (
    <Rise delay={delay} frozen={frozen}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <Mascot name={name} character={character} />
        <View style={{ flex: 1, paddingTop: space['2xs'] }}>
          <Text variant="voice">{children}</Text>
        </View>
      </View>
    </Rise>
  );
}

// ---------------------------------------------------------------------------
// EncouragementChip — celebrates a REAL kept commitment. Earned warmth,
// never for app-opening. Subtle mount.
// ---------------------------------------------------------------------------
export function EncouragementChip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Rise>
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.encourage,
          borderRadius: layout.radius.full,
          paddingVertical: space.xs,
          paddingHorizontal: space.md,
        }}
      >
        <Text variant="label" color="#FFFFFF">
          {text}
        </Text>
      </View>
    </Rise>
  );
}

// ---------------------------------------------------------------------------
// CrisisInline — the one calm, chromeless, MOTIONLESS place. Slate, never
// red, never playful. All Rise/MotiView wrappers inside crisis context must
// receive `frozen` so motion is suppressed even when a global setting
// wouldn't suppress it. Stillness is the signal.
// ---------------------------------------------------------------------------
export function CrisisInline({
  message,
  hotlines,
  preReview,
}: {
  message: string;
  hotlines: { name: string; contact: string; note: string }[];
  preReview: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={{
        borderRadius: layout.radius.card,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.card,
        padding: space.lg,
        gap: space.sm,
      }}
    >
      {message ? (
        <Text variant="voice" color={colors.crisis}>
          {message}
        </Text>
      ) : null}
      {hotlines.map((h) => (
        <View key={h.name} style={{ gap: 2 }}>
          <Text variant="label" color={colors.crisis}>
            {h.name}
          </Text>
          <Text variant="body">{h.contact}</Text>
          <Text variant="caption" soft>
            {h.note}
          </Text>
        </View>
      ))}
      {preReview && (
        <Text variant="caption" soft>
          Support content is awaiting professional review; these resources are
          here now because your safety comes before any gate.
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Icon — thin wrapper around lucide so screens don't deal with stroke/size
// defaults directly. Active stroke = ink, soft stroke = inkSoft.
// ---------------------------------------------------------------------------
export function Icon({
  glyph: Glyph,
  size = 20,
  soft = false,
  color,
  strokeWidth = 1.75,
}: {
  glyph: LucideIcon;
  size?: number;
  soft?: boolean;
  color?: string;
  strokeWidth?: number;
}) {
  const { colors } = useTheme();
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      color={color ?? (soft ? colors.inkSoft : colors.ink)}
    />
  );
}

// ---------------------------------------------------------------------------
// ProgressBar — clean horizontal progress, hairline track, accent fill.
// ---------------------------------------------------------------------------
export function ProgressBar({
  value,
  height = 4,
  color,
}: {
  /** 0-100 */
  value: number;
  height?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: pct, min: 0, max: 100 }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.hairline,
        overflow: 'hidden',
      }}
    >
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
        style={{
          height: '100%',
          backgroundColor: color ?? colors.accent,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chip — small uppercase pill for phase/status metadata. Variant controls
// the tonal weight ("muted" = hairline outline, "filled" = soft accent).
// ---------------------------------------------------------------------------
export function Chip({
  label,
  variant = 'muted',
  color,
}: {
  label: string;
  variant?: 'muted' | 'filled' | 'success';
  color?: string;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'filled'
      ? color ?? colors.accent
      : variant === 'success'
      ? colors.encourage
      : 'transparent';
  const fg =
    variant === 'muted' ? colors.inkSoft : '#FFFFFF';
  const border = variant === 'muted' ? colors.hairline : 'transparent';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderColor: border,
        borderWidth: variant === 'muted' ? 1 : 0,
        borderRadius: layout.radius.full,
        paddingHorizontal: space.sm,
        paddingVertical: 4,
      }}
    >
      <Text variant="caption" color={fg} style={{ letterSpacing: 0.3, fontWeight: '600' }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TaskRow — checkbox + label + optional caption. The core unit of Today
// and the Path detail. Checkbox press = soft scale + check-fill animation.
// Pass `frozen` for crisis surfaces (not expected but kept consistent).
// ---------------------------------------------------------------------------
export function TaskRow({
  label,
  caption,
  done,
  onToggle,
  onOpen,
  frozen = false,
}: {
  label: string;
  caption?: string;
  done: boolean;
  onToggle: () => void;
  /** When provided, tapping the body of the row opens the workspace
   *  (the checkbox still toggles done). When omitted, the whole row
   *  toggles — preserves the old behavior for callers that haven't
   *  wired the workspace yet. */
  onOpen?: () => void;
  frozen?: boolean;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const skipMotion = frozen || reduce;
  const checkbox = (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`Mark ${label} ${done ? 'todo' : 'done'}`}
      onPress={onToggle}
      hitSlop={10}
      style={{ marginTop: 2 }}
    >
      <MotiView
        animate={{
          backgroundColor: done ? colors.encourage : 'transparent',
          borderColor: done ? colors.encourage : colors.hairline,
          scale: done && !skipMotion ? 1 : 1,
        }}
        transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.25,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done && <Check size={14} color="#FFFFFF" strokeWidth={2.5} />}
      </MotiView>
    </Pressable>
  );

  const body = (
    <View style={{ flex: 1, gap: 2 }}>
      <Text
        variant="body"
        style={{
          textDecorationLine: done ? 'line-through' : 'none',
          color: done ? colors.inkSoft : colors.ink,
        }}
      >
        {label}
      </Text>
      {caption ? (
        <Text variant="caption" soft>
          {caption}
        </Text>
      ) : null}
    </View>
  );

  // If onOpen is provided we render two side-by-side Pressables — checkbox
  // toggles, body opens. Otherwise the whole row is one Pressable that
  // toggles (back-compat for callers that haven't wired the workspace).
  if (onOpen) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: space.sm,
          paddingVertical: space.sm,
        }}
      >
        {checkbox}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open workspace for ${label}`}
          onPress={onOpen}
          style={{ flex: 1 }}
        >
          {body}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.sm,
        paddingVertical: space.sm,
      }}
    >
      {checkbox}
      {body}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Re-export the motion suppression hook so callers (screens) can branch UI
// on reduced motion without importing moti directly.
// ---------------------------------------------------------------------------
export { useReducedMotion } from '@/design/useReducedMotion';
// `useDynamicAnimation` is re-exported so screen-level call sites can build
// imperative motion sequences (e.g. companion message arrival → settle).
export { useDynamicAnimation };
