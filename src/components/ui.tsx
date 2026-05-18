/**
 * Shared UI — warm, tactile, friendly. Chunky pressable buttons with a slab
 * edge (Duolingo feel), soft cards, a companion with a face, encouragement
 * that celebrates real substance. Crisis is the one calm, chromeless place.
 */
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/design/theme';
import { layout, shadow, space } from '@/design/tokens';
import { Text } from '@/design/Text';

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: space['3xl'] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

/** Soft pillowy surface. Cards earn their place — used for grouped meaning. */
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

/**
 * Chunky tactile button with a solid bottom edge that collapses on press.
 * Satisfying, never bouncy-spammy. Min 54px (Duolingo-grade tap target).
 */
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
  const press = useRef(new Animated.Value(0)).current;
  const off = disabled || busy;

  const primary = variant === 'primary';
  const soft = variant === 'soft';
  const bg = primary ? colors.accent : soft ? colors.card : 'transparent';
  const edge = primary ? colors.accentEdge : colors.hairline;
  const fg = primary ? '#FFFFFF' : colors.ink;
  const EDGE = 4;

  const animate = (to: number) =>
    Animated.spring(press, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      onPressIn={() => !off && animate(EDGE)}
      onPressOut={() => !off && animate(0)}
      onPress={off ? undefined : onPress}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={{ borderRadius: layout.radius.control, backgroundColor: edge }}>
        <Animated.View
          style={{
            transform: [{ translateY: press }],
            marginBottom: EDGE,
            minHeight: layout.controlHeight,
            paddingVertical: space.sm,
            paddingHorizontal: space.lg,
            borderRadius: layout.radius.control,
            backgroundColor: bg,
            borderWidth: variant === 'ghost' ? 1.5 : 0,
            borderColor: colors.hairline,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {busy ? (
            <ActivityIndicator color={fg} />
          ) : (
            <Text variant="button" color={fg} style={{ textAlign: 'center' }}>
              {label}
            </Text>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

/**
 * The companion's warm presence glyph. Nameless by default — shows a soft
 * mark; once the user names it, shows the initial. Either way it has a face.
 */
export function Mascot({ name }: { name: string | null }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={name ? `${name}, your companion` : 'your companion'}
      style={{
        width: 40,
        height: 40,
        borderRadius: layout.radius.full,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadow.rest,
      }}
    >
      <Text variant="button" color="#FFFFFF">
        {name ? name.slice(0, 1).toUpperCase() : '◆'}
      </Text>
    </View>
  );
}

/** The companion's bubble — soft card, Fraunces voice, presence. */
export function CompanionBubble({
  name,
  children,
}: {
  name: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
      <Mascot name={name} />
      <Card style={{ flex: 1, borderTopLeftRadius: 6 }}>
        <Text variant="voice">{children}</Text>
      </Card>
    </View>
  );
}

/** Celebrates a REAL kept commitment — earned warmth, never for app-opening. */
export function EncouragementChip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
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
  );
}

/** Crisis — the one calm, chromeless, motionless place. Slate, never red. */
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
