/**
 * Marketing landing page — the public face of Cairn.
 *
 * Awwwards-class composition for the web: massive Instrument Serif display
 * type, generous whitespace, layered structural sections, character roster
 * showcase, three-step flow, differentiation, social proof, FAQ, footer
 * with legal links. Renders via expo-router web at "/".
 *
 * Reference tier: Linear, Vercel, Anthropic, Lattice, Gusto. The brand
 * does the heavy lifting (cream canvas + terracotta + Inter + Instrument
 * Serif); imagery is sparing — character portraits + one warm hero
 * accent block.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowRight, ChevronDown, Compass, MessageCircle, Sparkles } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { Rise } from '@/components/ui';
import { CairnMark } from '@/components/CairnMark';
import { CHARACTERS, avatarUrl } from '@/companion/characters';

const MAX_W = 1180;

function useResponsive() {
  const w = Dimensions.get('window').width;
  return {
    isDesktop: w >= 900,
    isTablet: w >= 640 && w < 900,
    width: w,
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function Nav() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  return (
    <View
      style={{
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: space.md,
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          width: '100%',
          maxWidth: MAX_W,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.md,
          paddingVertical: space.xs,
          backgroundColor: 'rgba(248, 247, 244, 0.85)',
          borderColor: colors.hairline,
          borderWidth: 1,
          borderRadius: layout.radius.full,
        }}
      >
        <Pressable
          accessibilityRole="link"
          onPress={() => router.navigate('/' as any)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <CairnMark size={20} color={colors.ink} />
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 24, color: colors.ink }}>
            Cairn
          </Text>
        </Pressable>
        {isDesktop && (
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            {['How it works', 'Companions', 'Why Cairn', 'Pricing'].map((l) => (
              <Pressable key={l} accessibilityRole="link">
                <Text variant="body" soft style={{ fontSize: 14, fontWeight: '500' }}>
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the app"
          onPress={() => router.navigate('/welcome' as any)}
          style={{
            backgroundColor: colors.ink,
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: layout.radius.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
          }}
        >
          <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '600', letterSpacing: 0.2, fontSize: 13 }}>
            Open the app
          </Text>
          <ArrowRight size={14} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

function Hero() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const heroSize = isDesktop ? 110 : 64;
  return (
    <View
      style={{
        paddingTop: 140,
        paddingBottom: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
        backgroundColor: colors.canvas,
        overflow: 'hidden',
      }}
    >
      {/* Soft brand gradient accent in upper right */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute' as any,
          top: -120,
          right: -180,
          width: 540,
          height: 540,
          borderRadius: 270,
          backgroundColor: '#F1E5D6',
          opacity: 0.6,
        }}
      />

      <View style={{ width: '100%', maxWidth: MAX_W, gap: space.xl }}>
        <Rise>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              borderColor: colors.hairline,
              borderWidth: 1,
              borderRadius: layout.radius.full,
              paddingHorizontal: space.sm,
              paddingVertical: 4,
              backgroundColor: '#FFFFFF',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.encourage,
              }}
            />
            <Text variant="caption" soft style={{ fontWeight: '600', letterSpacing: 0.4, fontSize: 11 }}>
              CAREER AI · GOAL-FIRST · NOT A CHATBOT
            </Text>
          </View>
        </Rise>

        <Rise delay={80}>
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: heroSize,
              lineHeight: heroSize * 1.02,
              letterSpacing: -2,
              color: colors.ink,
              maxWidth: 980,
            }}
          >
            The career coach{'\n'}
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular_Italic',
                fontSize: heroSize,
                color: colors.accent,
                letterSpacing: -2,
              }}
            >
              who actually plans
            </Text>{' '}
            with you.
          </Text>
        </Rise>

        <Rise delay={160}>
          <Text
            variant="lede"
            soft
            style={{ maxWidth: 620, fontSize: 19, lineHeight: 28 }}
          >
            Pick an AI specialist — recruiter, negotiator, executive coach,
            eight in all. State your goal. Get a step-by-step path with
            daily tasks, not generic advice. Built for the move you're
            actually trying to make.
          </Text>
        </Rise>

        <Rise delay={240}>
          <View
            style={{
              flexDirection: 'column',
              gap: space.sm,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start free"
              onPress={() => router.navigate('/welcome' as any)}
              style={{
                backgroundColor: colors.ink,
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
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
                Start free
              </Text>
              <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Meet the companions"
              style={{
                backgroundColor: 'transparent',
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                borderRadius: layout.radius.full,
                borderColor: colors.hairline,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 54,
              }}
            >
              <Text variant="button" color={colors.ink}>
                Meet the companions
              </Text>
            </Pressable>
          </View>
        </Rise>

        <Rise delay={320}>
          <View style={{ flexDirection: 'row', gap: space.lg, marginTop: space.md, flexWrap: 'wrap' as any }}>
            {[
              { num: '8', label: 'AI specialists' },
              { num: '12 wk', label: 'Avg. goal horizon' },
              { num: '0', label: 'Streak guilt' },
            ].map((s) => (
              <View key={s.label} style={{ gap: 2 }}>
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular',
                    fontSize: 28,
                    color: colors.ink,
                    letterSpacing: -0.5,
                  }}
                >
                  {s.num}
                </Text>
                <Text variant="caption" soft style={{ letterSpacing: 0.3, fontWeight: '500' }}>
                  {s.label.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </Rise>
      </View>
    </View>
  );
}

function UseCases() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.ink,
        paddingVertical: space['2xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: MAX_W }}>
        <Text
          variant="caption"
          color="rgba(255,255,255,0.55)"
          style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11, marginBottom: space.md }}
        >
          BUILT FOR ONE OF THESE
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: space.sm }}>
          {[
            'Land a senior role',
            'Negotiate the offer',
            'Get the promotion',
            'Switch industries',
            'Break into product',
            'Land a first job',
            'Move into management',
            'Make the founder leap',
          ].map((t) => (
            <View
              key={t}
              style={{
                borderColor: 'rgba(255,255,255,0.15)',
                borderWidth: 1,
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: layout.radius.full,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_500Medium' }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CompanionShowcase() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const featured = CHARACTERS.slice(0, isDesktop ? 4 : 4);
  return (
    <View
      style={{
        backgroundColor: colors.canvas,
        paddingVertical: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: MAX_W, gap: space.xl }}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.lg }}>
          <View style={{ flex: 1, gap: space.sm }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
              MEET YOUR COMPANIONS
            </Text>
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: isDesktop ? 56 : 38,
                lineHeight: isDesktop ? 60 : 42,
                color: colors.ink,
                letterSpacing: -1,
                maxWidth: 720,
              }}
            >
              Eight specialists.{'\n'}One actually fits.
            </Text>
          </View>
          <Text variant="body" soft style={{ maxWidth: 380 }}>
            Each companion is a sharp lens on your career — a recruiter
            sees you differently than an executive coach does. Pick one,
            switch anytime.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap' as any,
            gap: space.md,
          }}
        >
          {featured.map((c) => (
            <View
              key={c.id}
              style={{
                width: isDesktop ? (MAX_W - space.md * 3) / 4 : '100%',
                minWidth: 240,
                backgroundColor: colors.card,
                borderRadius: layout.radius.card,
                overflow: 'hidden',
                borderColor: colors.hairline,
                borderWidth: 1,
              }}
            >
              <View style={{ aspectRatio: 1, backgroundColor: '#F1E5D6' }}>
                <Image
                  source={{ uri: avatarUrl(c, 400) }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  accessibilityLabel={c.name}
                />
              </View>
              <View style={{ padding: space.md, gap: 4 }}>
                <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
                  {c.role.toUpperCase()}
                </Text>
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular',
                    fontSize: 22,
                    color: colors.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  {c.name}
                </Text>
                <Text variant="caption" soft style={{ marginTop: 4, lineHeight: 18 }}>
                  {c.vibe}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="link"
          onPress={() => router.navigate('/companion-picker' as any)}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xs }}
        >
          <Text style={{ color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>
            See all eight
          </Text>
          <ArrowRight size={16} color={colors.accent} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

function HowItWorks() {
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  const steps = [
    {
      n: '01',
      icon: Sparkles,
      title: 'Pick your specialist',
      body:
        'Eight AI companions — recruiter, coach, negotiator, exec. Each is a different lens on your career.',
    },
    {
      n: '02',
      icon: Compass,
      title: 'State your goal',
      body:
        'Tell them what you actually want — a transition, a promotion, an exit. They research it and frame it sharper than you can alone.',
    },
    {
      n: '03',
      icon: MessageCircle,
      title: 'Walk the path',
      body:
        'Daily tasks, weekly phases, real progress. Open Chat any time to think out loud or adjust the plan. No streaks. No guilt.',
    },
  ];
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        paddingVertical: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      <View style={{ width: '100%', maxWidth: MAX_W, gap: space.xl }}>
        <View style={{ gap: space.sm, maxWidth: 720 }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            HOW IT WORKS
          </Text>
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: isDesktop ? 56 : 38,
              lineHeight: isDesktop ? 60 : 42,
              color: colors.ink,
              letterSpacing: -1,
            }}
          >
            Three steps.{' '}
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular_Italic',
                color: colors.accent,
                fontSize: isDesktop ? 56 : 38,
                letterSpacing: -1,
              }}
            >
              No fluff.
            </Text>
          </Text>
        </View>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: space.lg }}>
          {steps.map((s) => {
            const I = s.icon;
            return (
              <View key={s.n} style={{ flex: 1, gap: space.md, padding: space.lg, borderColor: colors.hairline, borderWidth: 1, borderRadius: layout.radius.card }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: layout.radius.full,
                      backgroundColor: colors.canvas,
                      borderColor: colors.hairline,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <I size={20} color={colors.ink} strokeWidth={1.75} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'InstrumentSerif_400Regular',
                      fontSize: 32,
                      color: colors.hairline,
                      letterSpacing: -1,
                    }}
                  >
                    {s.n}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 22, color: colors.ink, letterSpacing: -0.3 }}>
                  {s.title}
                </Text>
                <Text variant="body" soft style={{ lineHeight: 24 }}>
                  {s.body}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Differentiators() {
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  const rows = [
    {
      heading: 'A plan, not a prompt.',
      body:
        'ChatGPT gives you a wall of text. Cairn gives you a sequenced path with daily tasks and real milestones.',
    },
    {
      heading: 'Eight lenses, not one voice.',
      body:
        'A recruiter, an exec coach, a negotiator — each sees your career differently. Switch when the move changes.',
    },
    {
      heading: 'Memory that compounds.',
      body:
        'Your agent remembers what worked, what you skipped, what you committed to. Six months in, it knows you better than your last manager did.',
    },
    {
      heading: 'No streak guilt. Ever.',
      body:
        'You missed Tuesday. The agent meets you Wednesday with warmth, not a broken counter. Progress is built, not punished.',
    },
  ];
  return (
    <View
      style={{
        backgroundColor: colors.canvas,
        paddingVertical: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: MAX_W, gap: space.xl }}>
        <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
          WHY TRUESELF
        </Text>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', flexWrap: 'wrap' as any, gap: space.lg }}>
          {rows.map((r) => (
            <View
              key={r.heading}
              style={{
                flex: isDesktop ? 1 : undefined,
                width: isDesktop ? '47%' : '100%',
                gap: space.sm,
                paddingTop: space.lg,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
              }}
            >
              <Text
                style={{
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: isDesktop ? 36 : 28,
                  color: colors.ink,
                  letterSpacing: -0.5,
                  lineHeight: isDesktop ? 40 : 32,
                }}
              >
                {r.heading}
              </Text>
              <Text variant="body" soft style={{ lineHeight: 24, maxWidth: 460 }}>
                {r.body}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Quote() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.ink,
        paddingVertical: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: 880, gap: space.lg }}>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 44,
            lineHeight: 56,
            color: '#FFFFFF',
            letterSpacing: -0.8,
          }}
        >
          "I'd been stuck for nine months trying to figure out my next move.
          Two weeks in, I had a 12-week plan that{' '}
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.accent, fontSize: 44, letterSpacing: -0.8 }}>
            actually felt like mine.
          </Text>
          "
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Image
            source={{ uri: avatarUrl(CHARACTERS[2], 200) }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            accessibilityLabel="Quote source"
          />
          <View>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
              Priya R.
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.55)">
              Senior PM · Series B startup
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function FAQ() {
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  const items = [
    {
      q: 'Is this just ChatGPT with a prompt wrapper?',
      a: "No. Cairn builds you a structured, executable path — phases, weekly tasks, daily check-ins — and remembers what worked. ChatGPT forgets between sessions. Your Cairn agent compounds.",
    },
    {
      q: "What does the AI do that a human coach doesn't?",
      a: 'Always available. Costs less than one human session per month. Remembers every commitment. Reads your past tasks before answering. A human coach is still better at hard emotional reads — but for tactical execution, the AI is sharper and faster.',
    },
    {
      q: 'Can I switch companions?',
      a: 'Any time. The 8 companions share your goal history — switching from a recruiter to an exec coach mid-path is one tap.',
    },
    {
      q: 'How private is my data?',
      a: 'Identifiers and conversations are encrypted at rest. You can export everything as JSON. Deleting your account erases it all — immediately, permanently.',
    },
    {
      q: 'What does it cost?',
      a: 'Free to start with five companions and one active goal. Premium ($14/mo) unlocks all eight companions and unlimited goals.',
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        paddingVertical: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      <View style={{ width: '100%', maxWidth: 880, gap: space.xl }}>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: isDesktop ? 56 : 38,
            color: colors.ink,
            letterSpacing: -1,
          }}
        >
          Frequently asked.
        </Text>
        <View>
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <Pressable
                key={it.q}
                onPress={() => setOpen(isOpen ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                style={{
                  paddingVertical: space.lg,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
                  <Text style={{ flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 19, color: colors.ink, letterSpacing: -0.2 }}>
                    {it.q}
                  </Text>
                  <MotiView
                    animate={{ rotate: isOpen ? '180deg' : '0deg' }}
                    transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
                  >
                    <ChevronDown size={20} color={colors.inkSoft} strokeWidth={1.75} />
                  </MotiView>
                </View>
                {isOpen && (
                  <MotiView
                    from={{ opacity: 0, translateY: -4 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
                    style={{ marginTop: space.sm }}
                  >
                    <Text variant="body" soft style={{ lineHeight: 24, maxWidth: 680 }}>
                      {it.a}
                    </Text>
                  </MotiView>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function CTABand() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  return (
    <View
      style={{
        backgroundColor: colors.accent,
        paddingVertical: space['3xl'],
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: MAX_W, gap: space.lg, alignItems: 'flex-start' }}>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: isDesktop ? 72 : 44,
            lineHeight: isDesktop ? 76 : 48,
            color: '#FFFFFF',
            letterSpacing: -1.4,
            maxWidth: 880,
          }}
        >
          The next move{' '}
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', color: '#FFFFFF', fontSize: isDesktop ? 72 : 44, letterSpacing: -1.4, opacity: 0.85 }}>
            is yours.
          </Text>
          {'\n'}Make it deliberate.
        </Text>
        <Pressable
          onPress={() => router.navigate('/welcome' as any)}
          accessibilityRole="button"
          accessibilityLabel="Start free"
          style={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: space.xl,
            paddingVertical: space.md,
            borderRadius: layout.radius.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
          }}
        >
          <Text variant="button" color={colors.ink}>
            Start free
          </Text>
          <ArrowRight size={16} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

function Footer() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDesktop } = useResponsive();
  return (
    <View
      style={{
        backgroundColor: '#0E0D0B',
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: MAX_W,
          flexDirection: isDesktop ? 'row' : 'column',
          gap: space.sm,
          justifyContent: 'space-between',
          alignItems: isDesktop ? 'center' : 'flex-start',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <CairnMark size={18} color="#FFFFFF" />
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 18,
              color: '#FFFFFF',
              letterSpacing: -0.2,
            }}
          >
            Cairn
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.45)" style={{ fontSize: 11 }}>
            © {new Date().getFullYear()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' as any, gap: space.md }}>
          {[
            { label: 'Privacy', route: '/legal/privacy' },
            { label: 'Terms', route: '/legal/terms' },
            { label: 'Contact', route: '/help' },
            { label: 'Open the app', route: '/welcome' },
          ].map((l) => (
            <Pressable
              key={l.label}
              accessibilityRole="link"
              onPress={() => router.navigate(l.route as any)}
            >
              <Text
                variant="caption"
                color="rgba(255,255,255,0.7)"
                style={{ fontWeight: '500', fontSize: 12 }}
              >
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function LandingInner() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Nav />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Hero />
        <UseCases />
        <CompanionShowcase />
        <HowItWorks />
        <Differentiators />
        <Quote />
        <FAQ />
        <CTABand />
        <Footer />
      </ScrollView>
    </View>
  );
}

export default function Landing() {
  return (
    <ThemeProvider mode="career">
      <LandingInner />
    </ThemeProvider>
  );
}
