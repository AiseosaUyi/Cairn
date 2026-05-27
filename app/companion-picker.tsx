/**
 * Companion picker — pick your AI agent from a roster of 8 character
 * archetypes (HR, recruiter, coach, negotiator, etc.). Pattern matches
 * the founder's reference: a focused front card with the next card
 * peeking, swipe horizontally, filter chips at the top, big CTA below.
 *
 * Used in two places:
 *   1) During onboarding (after region) — link from /onboarding
 *   2) From the You tab as a "Change your companion" entry — link from /you
 *
 * Placeholder portraits use DiceBear "personas" — production swaps to a
 * generated-image pipeline using `buildImagePrompt(c)` from characters.ts.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowLeft, Check, ImagePlus } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { Button, Card, Chip, Rise, Screen } from '@/components/ui';
import { setProfile } from '@/profile';
import {
  CHARACTERS,
  avatarUrl,
  findCharacter,
  type Character,
} from '@/companion/characters';

type RoleFilter = 'All' | 'Free' | 'Premium';
type RegionFilter = 'All' | Character['region'];

const FILTER_REGIONS: RegionFilter[] = ['All', 'Global', 'US', 'EU', 'APAC', 'NG'];
const FILTER_TIERS: RoleFilter[] = ['All', 'Free', 'Premium'];

function CompanionCard({
  c,
  primary,
  onChoose,
}: {
  c: Character;
  primary: boolean;
  onChoose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.ink,
        borderRadius: layout.radius.sheet,
        overflow: 'hidden',
        ...shadow.raised,
      }}
    >
      <View
        style={{
          aspectRatio: 0.78,
          backgroundColor: '#F1E5D6',
          position: 'relative',
        }}
      >
        <Image
          source={{ uri: avatarUrl(c, 600) }}
          accessibilityLabel={`Portrait of ${c.name}`}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
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
            <Text variant="caption" color="#0E0D0B" style={{ fontWeight: '700', letterSpacing: 0.4 }}>
              PREMIUM
            </Text>
          </View>
        )}
        {/* Region pill */}
        <View
          style={{
            position: 'absolute',
            top: space.md,
            right: space.md,
            backgroundColor: 'rgba(14,13,11,0.55)',
            paddingHorizontal: space.sm,
            paddingVertical: 4,
            borderRadius: layout.radius.full,
          }}
        >
          <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '600', letterSpacing: 0.4 }}>
            {c.region.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ gap: 4 }}>
          <Text
            variant="caption"
            color="rgba(255,255,255,0.55)"
            style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}
          >
            {c.role.toUpperCase()}
          </Text>
          <Text
            color="#FFFFFF"
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 28,
              lineHeight: 32,
              letterSpacing: -0.3,
            }}
          >
            {c.name}
          </Text>
        </View>

        <Text variant="body" color="rgba(255,255,255,0.75)">
          {c.vibe}
        </Text>

        <View style={{ gap: 6, marginTop: space.xs }}>
          {c.skills.map((s) => (
            <View key={s} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                  marginTop: 8,
                }}
              />
              <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ flex: 1 }}>
                {s}
              </Text>
            </View>
          ))}
        </View>

        {primary && (
          <Pressable
            onPress={onChoose}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${c.name} as your companion`}
            style={{
              marginTop: space.md,
              backgroundColor: '#FFFFFF',
              borderRadius: layout.radius.full,
              minHeight: 50,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="button" color="#0E0D0B">
              Choose {c.name}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Inner() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { colors } = useTheme();
  const [tier, setTier] = useState<RoleFilter>('All');
  const [region, setRegion] = useState<RegionFilter>('All');
  const [index, setIndex] = useState(0);
  const [choosing, setChoosing] = useState(false);

  const filtered = useMemo(
    () =>
      CHARACTERS.filter((c) => {
        if (tier === 'Free' && c.premium) return false;
        if (tier === 'Premium' && !c.premium) return false;
        if (region !== 'All' && c.region !== region) return false;
        return true;
      }),
    [tier, region],
  );

  const current = filtered[index] ?? filtered[0];

  const choose = useCallback(
    async (c: Character) => {
      setChoosing(true);
      await setProfile({ companionId: c.id });
      // Forward flow (onboarding) uses ?next=/career; standalone flow
      // (You tab) omits next and bounces back to where the user was.
      if (next) {
        router.replace(next as any);
      } else {
        router.back();
      }
    },
    [router, next],
  );

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(screenWidth - space.lg * 2, layout.maxContentWidth - space.lg * 2);

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
        <Pressable
          onPress={() => (next ? router.replace(next as any) : router.back())}
          accessibilityRole="button"
          accessibilityLabel="Skip"
        >
          <Text variant="label" color={colors.accent} style={{ textTransform: 'none', fontSize: 14 }}>
            Skip
          </Text>
        </Pressable>
      </View>

      <Rise>
        <View style={{ gap: 8 }}>
          <Text variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
            Choose your{'\n'}AI companion.
          </Text>
          <Text variant="lede" soft>
            Eight specialists. Each one frames your goals through their lens.
            You can change anytime.
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <View style={{ gap: space.sm }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.xs }}
          >
            {FILTER_TIERS.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setTier(t);
                  setIndex(0);
                }}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: layout.radius.full,
                  backgroundColor: tier === t ? colors.ink : 'transparent',
                  borderWidth: 1,
                  borderColor: tier === t ? colors.ink : colors.hairline,
                }}
              >
                <Text
                  variant="caption"
                  color={tier === t ? '#FFFFFF' : colors.ink}
                  style={{ fontWeight: '600', letterSpacing: 0.3, fontSize: 12 }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
            <View style={{ width: space.sm }} />
            {FILTER_REGIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setRegion(r);
                  setIndex(0);
                }}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: layout.radius.full,
                  backgroundColor: region === r ? colors.ink : 'transparent',
                  borderWidth: 1,
                  borderColor: region === r ? colors.ink : colors.hairline,
                }}
              >
                <Text
                  variant="caption"
                  color={region === r ? '#FFFFFF' : colors.ink}
                  style={{ fontWeight: '600', letterSpacing: 0.3, fontSize: 12 }}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Rise>

      <Rise delay={120}>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: cardWidth,
              position: 'relative',
              alignItems: 'center',
            }}
          >
            {/* Background peek card (next character) */}
            {filtered[index + 1] && (
              <View
                style={{
                  position: 'absolute',
                  top: -10,
                  width: cardWidth - 24,
                  height: cardWidth * 1.55,
                  backgroundColor: colors.accent,
                  opacity: 0.85,
                  borderRadius: layout.radius.sheet,
                  zIndex: 0,
                }}
              />
            )}
            {current && (
              <MotiView
                key={current.id}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
                style={{ width: cardWidth, zIndex: 1 }}
              >
                <CompanionCard
                  c={current}
                  primary
                  onChoose={() => choose(current)}
                />
              </MotiView>
            )}
          </View>

          {/* Pagination dots + prev/next */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Pressable
              accessibilityLabel="Previous companion"
              disabled={index === 0}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: layout.radius.full,
                backgroundColor: colors.card,
                borderColor: colors.hairline,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: index === 0 ? 0.4 : 1,
              }}
            >
              <ArrowLeft size={16} color={colors.ink} strokeWidth={1.75} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {filtered.map((c, i) => (
                <View
                  key={c.id}
                  style={{
                    width: i === index ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === index ? colors.ink : colors.hairline,
                  }}
                />
              ))}
            </View>
            <Pressable
              accessibilityLabel="Next companion"
              disabled={index >= filtered.length - 1}
              onPress={() => setIndex((i) => Math.min(filtered.length - 1, i + 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: layout.radius.full,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: index >= filtered.length - 1 ? 0.4 : 1,
              }}
            >
              <ArrowLeft
                size={16}
                color="#FFFFFF"
                strokeWidth={1.75}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </Pressable>
          </View>
        </View>
      </Rise>

      <Rise delay={180}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload your own image"
          onPress={() => {
            /* TODO wire to image picker → cartoon-conversion pipeline */
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            padding: space.md,
            borderRadius: layout.radius.card,
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderWidth: 1,
            borderStyle: 'dashed',
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
            <ImagePlus size={18} color={colors.ink} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              Upload your own
            </Text>
            <Text variant="caption" soft>
              We'll cartoon-ify it, matched to the cast style.
            </Text>
          </View>
        </Pressable>
      </Rise>
    </Screen>
  );
}

export default function CompanionPicker() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
