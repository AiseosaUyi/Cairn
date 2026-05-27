/**
 * Welcome — 3-step paged onboarding intro. Replaces the single-screen
 * welcome card. Pattern: horizontal-paged scroll (Things 3 / Headspace /
 * Cron) with hero visual + display headline + sub + paging dots + dual
 * footer actions.
 *
 * Guest by default — no auth at onboarding. Account capability is deferred
 * to the natural friction point (Premium upgrade or post-first-phase
 * backup prompt). This matches the existing zero-credentials architecture
 * (local SQLite + expo-secure-store) and keeps activation friction near
 * zero. Sign-in moves are tracked as a separate post-launch workstream.
 */
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Image,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowRight, Sparkles, Compass, Leaf } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { CHARACTERS, avatarUrl } from '@/companion/characters';
import { CairnMark } from '@/components/CairnMark';

interface Slide {
  eyebrow: string;
  title: string;
  italic: string;
  body: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'STEP ONE',
    title: 'Meet your',
    italic: 'specialist.',
    body:
      'Eight AI companions — recruiter, coach, negotiator, exec. Each frames your career through a different lens. You pick the one that fits the move.',
    cta: 'Continue',
  },
  {
    eyebrow: 'STEP TWO',
    title: 'Get a path,',
    italic: 'not a pep talk.',
    body:
      'State your goal — a transition, a promotion, an offer. Your companion researches it and builds a step-by-step path: weekly phases, daily tasks, real progress.',
    cta: 'Continue',
  },
  {
    eyebrow: 'STEP THREE',
    title: 'Show up.',
    italic: 'No streaks.',
    body:
      'Tend the path on the days you can. Miss a day and the companion meets you Wednesday with warmth, not a broken counter. Progress is built, not punished.',
    cta: 'Get started',
  },
];

// ---------------------------------------------------------------------------
// Slide 1: Companion roster — three avatars stacked with a gentle float
// ---------------------------------------------------------------------------
function HeroCompanions() {
  const { colors } = useTheme();
  const featured = CHARACTERS.slice(0, 3);
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: space.lg }}>
      <View
        style={{
          width: 280,
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Soft brand blob */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: '#F1E5D6',
            opacity: 0.7,
          }}
        />
        {featured.map((c, i) => {
          const positions = [
            { left: 14, top: 30, size: 110, z: 1, delay: 0 },
            { left: 95, top: 0, size: 140, z: 3, delay: 80 },
            { left: 170, top: 60, size: 110, z: 2, delay: 160 },
          ][i];
          return (
            <MotiView
              key={c.id}
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: motion.duration.medium,
                delay: positions.delay,
                easing: Easing.out(Easing.quad),
              }}
              style={{
                position: 'absolute',
                left: positions.left,
                top: positions.top,
                width: positions.size,
                height: positions.size,
                borderRadius: positions.size / 2,
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                overflow: 'hidden',
                zIndex: positions.z,
                ...shadow.raised,
              }}
            >
              <Image
                source={{ uri: avatarUrl(c, 400) }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                accessibilityLabel={c.name}
              />
            </MotiView>
          );
        })}
        {/* Floating role chips */}
        {[
          { label: 'COACH', top: 8, left: -6 },
          { label: 'RECRUITER', top: 200, left: 8 },
          { label: 'NEGOTIATOR', top: 220, right: 0 },
        ].map((chip, i) => (
          <MotiView
            key={chip.label}
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'timing',
              duration: motion.duration.short,
              delay: 240 + i * 80,
              easing: Easing.out(Easing.quad),
            }}
            style={{
              position: 'absolute',
              top: chip.top,
              left: chip.left,
              right: chip.right as number | undefined,
              backgroundColor: colors.ink,
              paddingHorizontal: space.sm,
              paddingVertical: 4,
              borderRadius: layout.radius.full,
              zIndex: 5,
            }}
          >
            <Text
              variant="caption"
              color="#FFFFFF"
              style={{ fontWeight: '600', letterSpacing: 0.4, fontSize: 10 }}
            >
              {chip.label}
            </Text>
          </MotiView>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide 2: A goal → phase → daily-task visual stack
// ---------------------------------------------------------------------------
function HeroPath() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: space.lg,
      }}
    >
      <View style={{ width: '100%', maxWidth: 320, gap: space.sm }}>
        {/* Goal card (dark, mimics Today) */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
          style={{
            backgroundColor: colors.ink,
            borderRadius: layout.radius.card,
            padding: space.md,
            ...shadow.raised,
          }}
        >
          <Text variant="caption" color={colors.accent} style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 10 }}>
            ACTIVE GOAL
          </Text>
          <Text
            color="#FFFFFF"
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 20,
              lineHeight: 24,
              marginTop: 4,
              letterSpacing: -0.2,
            }}
          >
            Land a senior PM role
          </Text>
          <View
            style={{
              height: 3,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              marginTop: 12,
              overflow: 'hidden',
            }}
          >
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: '44%' }}
              transition={{ type: 'timing', duration: 800, delay: 200, easing: Easing.out(Easing.quad) }}
              style={{ height: '100%', backgroundColor: colors.accent }}
            />
          </View>
          <Text variant="caption" color="rgba(255,255,255,0.55)" style={{ marginTop: 6, fontSize: 11 }}>
            Phase 2 of 4 · 44%
          </Text>
        </MotiView>

        {/* Task list peek */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: motion.duration.medium, delay: 120, easing: Easing.out(Easing.quad) }}
          style={{
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderWidth: 1,
            borderRadius: layout.radius.card,
            padding: space.md,
            gap: space.sm,
          }}
        >
          <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 10 }}>
            ON YOUR PATH · TODAY
          </Text>
          {[
            { label: 'Outline case #1 (metric, bet, regret)', done: true },
            { label: 'Send to 2 senior PMs for hostile feedback', done: false },
            { label: 'Block 90 min tomorrow for draft', done: false },
          ].map((t, i) => (
            <MotiView
              key={i}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 240, delay: 280 + i * 80 }}
              style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  backgroundColor: t.done ? colors.encourage : 'transparent',
                  borderColor: t.done ? colors.encourage : colors.hairline,
                  borderWidth: 1.25,
                }}
              />
              <Text
                variant="body"
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: t.done ? colors.inkSoft : colors.ink,
                  textDecorationLine: t.done ? 'line-through' : 'none',
                }}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            </MotiView>
          ))}
        </MotiView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide 3: Calendar / no-streak ethos visual
// ---------------------------------------------------------------------------
function HeroEthos() {
  const { colors } = useTheme();
  const days = [
    { label: 'M', state: 'done' },
    { label: 'T', state: 'done' },
    { label: 'W', state: 'rest' },
    { label: 'T', state: 'done' },
    { label: 'F', state: 'today' },
    { label: 'S', state: 'soon' },
    { label: 'S', state: 'soon' },
  ];
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: space.lg }}>
      <View style={{ width: '100%', maxWidth: 320, gap: space.md }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 10 }}>
              THIS WEEK
            </Text>
            <Text variant="caption" soft style={{ fontSize: 11 }}>
              3 of 7 days tended
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
            {days.map((d, i) => {
              const fill =
                d.state === 'done'
                  ? colors.encourage
                  : d.state === 'today'
                  ? colors.accent
                  : 'transparent';
              const stroke =
                d.state === 'done'
                  ? colors.encourage
                  : d.state === 'today'
                  ? colors.accent
                  : colors.hairline;
              const fg = d.state === 'done' || d.state === 'today' ? '#FFFFFF' : colors.inkSoft;
              return (
                <MotiView
                  key={i}
                  from={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'timing',
                    duration: 240,
                    delay: 160 + i * 60,
                    easing: Easing.out(Easing.quad),
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: fill,
                    borderColor: stroke,
                    borderWidth: 1.25,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="caption" color={fg} style={{ fontSize: 11, fontWeight: '600' }}>
                    {d.label}
                  </Text>
                </MotiView>
              );
            })}
          </View>
          <Text variant="caption" soft style={{ marginTop: 4, fontSize: 12 }}>
            Wednesday rested. No flame broken. Today is still here.
          </Text>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: motion.duration.medium, delay: 600 }}
          style={{
            backgroundColor: colors.washTop,
            borderRadius: layout.radius.card,
            padding: space.md,
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'center',
          }}
        >
          <Leaf size={18} color={colors.encourage} strokeWidth={1.75} />
          <Text variant="caption" style={{ flex: 1, fontStyle: 'italic', fontSize: 13 }}>
            "Glad you're back. Want to pick up where we left off?"
          </Text>
        </MotiView>
      </View>
    </View>
  );
}

const HEROES = [HeroCompanions, HeroPath, HeroEthos];
const HERO_ICONS = [Sparkles, Compass, Leaf];

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width: winWidth } = Dimensions.get('window');
  const pageWidth = Math.min(winWidth, layout.maxContentWidth);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== index) setIndex(i);
  };

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated: true });
  };

  const isLast = index === SLIDES.length - 1;

  // Consent + sign-in path moved to /get-started after the final slide
  // (per 2026-05-27 onboarding overhaul). Welcome stays pure explanation;
  // legal acceptance happens on whichever path the user picks next.
  const advance = () => {
    if (!isLast) {
      go(index + 1);
      return;
    }
    router.replace('/get-started' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Top bar: brand wordmark + Skip */}
      <View
        style={{
          paddingTop: space.lg,
          paddingHorizontal: space.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CairnMark size={20} color={colors.ink} />
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, color: colors.ink }}>
            Cairn
          </Text>
        </View>
        <Pressable
          onPress={() => router.replace('/get-started' as any)}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text variant="caption" soft style={{ fontWeight: '600', letterSpacing: 0.3, fontSize: 13 }}>
            SKIP
          </Text>
        </Pressable>
      </View>

      {/* Paged hero + copy. Wrapper clips the slide track so only the
          current page is visible — on desktop the ScrollView would
          otherwise expose adjacent slides side-by-side. The CTA below
          drives `scrollTo()` to advance pages; the user never has to
          drag-scroll horizontally to progress. */}
      <View
        style={{
          flex: 1,
          width: pageWidth,
          alignSelf: 'center',
          overflow: 'hidden',
        }}
      >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {SLIDES.map((s, i) => {
          const Hero = HEROES[i];
          const Icon = HERO_ICONS[i];
          return (
            <View
              key={i}
              style={{
                width: pageWidth,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: space.lg,
                gap: space.xl,
                paddingVertical: space.lg,
              }}
            >
              <View style={{ height: 320, justifyContent: 'center' }}>
                <Hero />
              </View>
              <View style={{ gap: space.sm, maxWidth: 420, alignSelf: 'stretch' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Icon size={14} color={colors.accent} strokeWidth={2} />
                  <Text
                    variant="caption"
                    color={colors.accent}
                    style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}
                  >
                    {s.eyebrow}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular',
                    fontSize: 40,
                    lineHeight: 46,
                    color: colors.ink,
                    letterSpacing: -0.8,
                  }}
                >
                  {s.title}{' '}
                  <Text
                    style={{
                      fontFamily: 'InstrumentSerif_400Regular_Italic',
                      color: colors.accent,
                      fontSize: 40,
                      letterSpacing: -0.8,
                    }}
                  >
                    {s.italic}
                  </Text>
                </Text>
                <Text variant="lede" soft style={{ lineHeight: 24, marginTop: 4 }}>
                  {s.body}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      </View>

      {/* Footer: dots + (last-slide checkboxes) + CTA + legal */}
      <View
        style={{
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingBottom: space.lg,
          gap: space.md,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {SLIDES.map((_, i) => (
            <MotiView
              key={i}
              animate={{
                width: i === index ? 22 : 6,
                backgroundColor: i === index ? colors.ink : colors.hairline,
              }}
              transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </View>

        <Pressable
          onPress={advance}
          accessibilityRole="button"
          accessibilityLabel={SLIDES[index].cta}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: space.md,
            borderRadius: layout.radius.full,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            minHeight: 54,
            ...shadow.raised,
          }}
        >
          <Text variant="button" color="#FFFFFF">
            {SLIDES[index].cta}
          </Text>
          <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.25} />
        </Pressable>

        <Text variant="caption" soft style={{ textAlign: 'center', fontSize: 11 }}>
          Sign up, sign in, or continue as a guest on the next step.
        </Text>
      </View>
    </View>
  );
}

export default function Welcome() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
