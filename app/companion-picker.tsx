/**
 * Companion picker — Bumble-style swipe stack.
 *
 * Single viewport, no scroll. Header (back + upload + skip), card stack
 * (three cards visible — top is interactive, two peek behind), progress
 * dots, and primary CTA. Filters removed entirely per founder feedback
 * ("too much info").
 *
 * Interactions:
 *   - Drag the top card right → accept this companion → navigate.
 *   - Drag left → skip (card cycles to bottom of the stack).
 *   - Tap "Choose X" CTA → same as drag-right.
 *   - Tap upload icon (header) → web file picker; sets profile avatar
 *     and accepts a generated companion stub. Native picker is a
 *     follow-up.
 *
 * Animation:
 *   - Pan via react-native-gesture-handler v2.
 *   - Card translateX + Y + rotation as shared values.
 *   - "Choose" and "Skip" overlays fade in as the user drags past
 *     ~30% of the threshold.
 *   - Below-threshold release springs back to center.
 *   - Above-threshold release animates fully off-screen.
 *
 * `next` query param routes the navigation target on accept; default
 * `/career` so direct navigation works.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Dimensions, Image, Platform, Pressable, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Check, ImagePlus, X } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { setProfile } from '@/profile';
import { CHARACTERS, avatarUrl, type Character } from '@/companion/characters';

const SWIPE_DECISION_THRESHOLD = 110;
const SWIPE_VELOCITY_THRESHOLD = 700;

// ---------------------------------------------------------------------------
// One card — the static, non-interactive layout. The top card uses this
// inside a GestureDetector + Animated.View wrapper.
// ---------------------------------------------------------------------------
function CardSurface({ c }: { c: Character }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.ink,
        borderRadius: 28,
        overflow: 'hidden',
        ...shadow.raised,
      }}
    >
      <Image
        source={{ uri: avatarUrl(c, 600) }}
        accessibilityLabel={`Portrait of ${c.name}`}
        style={{ position: 'absolute', inset: 0 as any, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      {/* Bottom darkening gradient → keeps copy readable on busy portraits.
          Using a stack of progressively darker translucent rectangles is
          cheaper than an SVG/expo-linear-gradient dependency. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '55%',
          backgroundColor: 'rgba(0,0,0,0.0)',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: `rgba(14,13,11,${0.08 + i * 0.18})`,
            }}
          />
        ))}
      </View>
      {/* Premium badge */}
      {c.premium && (
        <View
          style={{
            position: 'absolute',
            top: space.md,
            left: space.md,
            backgroundColor: '#F5C063',
            paddingHorizontal: space.sm,
            paddingVertical: 4,
            borderRadius: layout.radius.full,
          }}
        >
          <Text variant="caption" color="#0E0D0B" style={{ fontWeight: '700', letterSpacing: 0.4, fontSize: 10 }}>
            PREMIUM
          </Text>
        </View>
      )}
      {/* Copy block — name, role, vibe */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: space.lg,
          gap: 4,
        }}
      >
        <Text
          variant="caption"
          color="rgba(255,255,255,0.7)"
          style={{ letterSpacing: 0.5, fontWeight: '700', fontSize: 11 }}
        >
          {c.role.toUpperCase()}
        </Text>
        <Text
          color="#FFFFFF"
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 34,
            lineHeight: 38,
            letterSpacing: -0.4,
          }}
        >
          {c.name}
        </Text>
        <Text
          color="rgba(255,255,255,0.82)"
          style={{ fontSize: 14, lineHeight: 20, marginTop: 4 }}
        >
          {c.vibe}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Top, draggable card. Reads the pan offset as shared values and applies
// transform + decision overlays. Calls back to JS to advance or accept.
// ---------------------------------------------------------------------------
function TopCard({
  c,
  onAccept,
  onSkip,
}: {
  c: Character;
  onAccept: () => void;
  onSkip: () => void;
}) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const screenW = Dimensions.get('window').width;

  const finishAccept = useCallback(() => onAccept(), [onAccept]);
  const finishSkip = useCallback(() => {
    // Reset position synchronously before swapping in the next character,
    // otherwise the new card starts off-screen.
    translateX.value = 0;
    translateY.value = 0;
    onSkip();
  }, [onSkip, translateX, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.4; // dampen vertical
    })
    .onEnd((e) => {
      const swipedRight =
        e.translationX > SWIPE_DECISION_THRESHOLD ||
        e.velocityX > SWIPE_VELOCITY_THRESHOLD;
      const swipedLeft =
        e.translationX < -SWIPE_DECISION_THRESHOLD ||
        e.velocityX < -SWIPE_VELOCITY_THRESHOLD;

      if (swipedRight) {
        translateX.value = withTiming(
          screenW * 1.4,
          { duration: 280, easing: Easing.out(Easing.quad) },
          () => runOnJS(finishAccept)(),
        );
        translateY.value = withTiming(translateY.value + 40, { duration: 280 });
      } else if (swipedLeft) {
        translateX.value = withTiming(
          -screenW * 1.4,
          { duration: 280, easing: Easing.out(Easing.quad) },
          () => runOnJS(finishSkip)(),
        );
        translateY.value = withTiming(translateY.value + 40, { duration: 280 });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 24}deg` },
    ],
  }));

  // Overlays fade in as the user crosses ~30% of the decision threshold.
  const acceptOverlay = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, (translateX.value - 30) / SWIPE_DECISION_THRESHOLD)),
  }));
  const skipOverlay = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, (-translateX.value - 30) / SWIPE_DECISION_THRESHOLD)),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        // touchAction:none stops mobile browsers from intercepting the
        // gesture for page scrolling. cursor/userSelect are web-only and
        // not in the RN ViewStyle type — cast keeps TS happy without
        // unused @ts-expect-error directives.
        style={[
          {
            ...StyleSheetAbsoluteFill,
            ...({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object),
          } as object,
          cardStyle,
        ]}
      >
        <CardSurface c={c} />

        {/* CHOOSE overlay (right swipe) */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 26,
              left: 26,
              transform: [{ rotate: '-14deg' }],
              borderColor: colors.encourage,
              borderWidth: 3,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 6,
            },
            acceptOverlay,
          ]}
        >
          <Text
            color={colors.encourage}
            style={{ fontWeight: '900', letterSpacing: 2, fontSize: 22 }}
          >
            CHOOSE
          </Text>
        </Animated.View>

        {/* SKIP overlay (left swipe) */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 26,
              right: 26,
              transform: [{ rotate: '14deg' }],
              borderColor: colors.inkSoft,
              borderWidth: 3,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 6,
            },
            skipOverlay,
          ]}
        >
          <Text
            color={colors.inkSoft}
            style={{ fontWeight: '900', letterSpacing: 2, fontSize: 22 }}
          >
            SKIP
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

// Inline replacement for StyleSheet.absoluteFillObject without importing
// StyleSheet — keeps the imports tight.
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ---------------------------------------------------------------------------
// Background peek cards — show 2 behind the top one, lightly offset +
// scaled down so the user sees there's depth to the deck.
// ---------------------------------------------------------------------------
function PeekCard({ c, depth }: { c: Character; depth: 1 | 2 }) {
  const scale = depth === 1 ? 0.94 : 0.88;
  const translateY = depth === 1 ? 14 : 28;
  const opacity = depth === 1 ? 0.6 : 0.35;
  return (
    <View
      pointerEvents="none"
      style={{
        ...StyleSheetAbsoluteFill,
        transform: [{ scale }, { translateY }],
        opacity,
      }}
    >
      <CardSurface c={c} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tiny progress dots — current card highlighted, others soft.
// ---------------------------------------------------------------------------
function Dots({ count, current }: { count: number; current: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 22 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? colors.ink : colors.hairline,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Web file picker for "Upload your own". Reads the file as a data URL so
// it survives a refresh without a CDN round-trip. Returns the dataURL or
// null on cancel/error.
// ---------------------------------------------------------------------------
async function pickImageWeb(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
function Inner() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { colors } = useTheme();
  const [idx, setIdx] = useState(0);
  // Stable shuffle ref — order stays fixed within a session so the
  // progress dots remain meaningful.
  const order = useRef<Character[]>(CHARACTERS).current;
  const total = order.length;
  const current = useMemo(() => order[idx % total], [idx, order, total]);
  const peek1 = useMemo(() => order[(idx + 1) % total], [idx, order, total]);
  const peek2 = useMemo(() => order[(idx + 2) % total], [idx, order, total]);

  const accept = useCallback(
    async (c: Character) => {
      await setProfile({ companionId: c.id });
      const target = next || '/career';
      router.replace(target as any);
    },
    [router, next],
  );

  const skip = useCallback(() => {
    setIdx((i) => (i + 1) % total);
  }, [total]);

  const onUpload = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Coming soon',
        'Uploading your own avatar from native apps will land with the cartoon-conversion pipeline. For now, pick a companion from the cast.',
      );
      return;
    }
    const dataUrl = await pickImageWeb();
    if (!dataUrl) return;
    // Save the uploaded image and keep the currently-visible character
    // as the companion persona — the photo overrides the avatar surface
    // (You-tab profile, chat header) but the AI persona stays consistent.
    await setProfile({ avatarUri: dataUrl, companionId: current.id });
    const target = next || '/career';
    router.replace(target as any);
  }, [current, router, next]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingHorizontal: space.lg,
        paddingTop: space.lg,
        paddingBottom: space.lg,
        maxWidth: layout.maxContentWidth,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      {/* Header — back, upload, skip. Compact so cards get the room. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.sm,
        }}
      >
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

        <Pressable
          onPress={onUpload}
          accessibilityRole="button"
          accessibilityLabel="Upload your own avatar"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: space.md,
            height: 40,
            borderRadius: layout.radius.full,
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
        >
          <ImagePlus size={16} color={colors.ink} strokeWidth={1.75} />
          <Text variant="caption" style={{ fontSize: 12, fontWeight: '600' }}>
            Upload your own
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (next) router.replace(next as any);
            else router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Skip"
          hitSlop={10}
          style={{ paddingHorizontal: space.xs, height: 40, justifyContent: 'center' }}
        >
          <Text variant="caption" color={colors.accent} style={{ fontSize: 13, fontWeight: '700' }}>
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Micro title — one line, no preachy subtext. The cards are the page. */}
      <View style={{ marginTop: space.md, gap: 2 }}>
        <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
          STEP 3 OF 3
        </Text>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 32,
            lineHeight: 36,
            color: colors.ink,
            letterSpacing: -0.6,
          }}
        >
          Pick your{' '}
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular_Italic',
              color: colors.accent,
              fontSize: 32,
            }}
          >
            companion.
          </Text>
        </Text>
      </View>

      {/* Card stack — fills remaining vertical space. Absolute children so
          they overlap; outer relative wrapper sets the actual size. */}
      <View
        style={{
          flex: 1,
          marginTop: space.md,
          marginBottom: space.md,
          position: 'relative',
        }}
      >
        <PeekCard c={peek2} depth={2} />
        <PeekCard c={peek1} depth={1} />
        <TopCard
          // Re-mount the top card every time idx changes so each new card
          // starts with translateX/Y back at 0 with no animation seam.
          key={current.id + idx}
          c={current}
          onAccept={() => accept(current)}
          onSkip={skip}
        />
      </View>

      {/* Dots + CTA below the stack — no scroll required. */}
      <View style={{ gap: space.md }}>
        <Dots count={total} current={idx % total} />

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {/* Manual skip button — covers users who don't realize they
              can swipe. Same as drag-left. */}
          <Pressable
            onPress={skip}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${current.name}`}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1.25,
              alignItems: 'center',
              justifyContent: 'center',
              ...shadow.rest,
            }}
          >
            <X size={22} color={colors.inkSoft} strokeWidth={2.25} />
          </Pressable>

          <Pressable
            onPress={() => accept(current)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${current.name}`}
            style={{
              flex: 1,
              minHeight: 56,
              borderRadius: 28,
              backgroundColor: colors.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              ...shadow.raised,
            }}
          >
            <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text variant="button" color="#FFFFFF">
              Choose {current.name}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CompanionPicker() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
