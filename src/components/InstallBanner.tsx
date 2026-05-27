/**
 * Mobile PWA install banner — sticky bottom strip on mobile web.
 *
 * Renders only when:
 *   - Running on web (mobile UA)
 *   - Not already installed (standalone display-mode false)
 *   - User hasn't dismissed for this session
 *
 * Behavior splits by platform:
 *   - Android / Chrome / Edge with prompt available: fires the captured
 *     `beforeinstallprompt` for the native OS install dialog. One tap.
 *   - Android without the prompt yet: Chrome hasn't decided the user is
 *     "engaged" enough — show a soft "give it a moment" hint plus the
 *     ⋮ menu → Install app manual path. Never show iOS Share-menu
 *     instructions (Android Chrome's Share menu doesn't install PWAs).
 *   - iOS Safari: no programmatic install path exists (Apple policy).
 *     Show the Share → Add to Home Screen walkthrough.
 *
 * Closes via the small × (sessionStorage dismiss — banner returns next
 * visit, doesn't nag within the same session).
 */
import { Platform, Pressable, View } from 'react-native';
import { useState } from 'react';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowDown, MoreVertical, Share, Smartphone, X } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { usePWAState, useDismissed } from '@/pwa/install';

function InstallInstructions({
  device,
  onClose,
}: {
  device: 'mobile-ios' | 'mobile-android' | 'desktop' | 'native';
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const isIOS = device === 'mobile-ios';

  return (
    <View
      style={{
        position: 'absolute' as any,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(14,13,11,0.55)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <MotiView
        from={{ translateY: 400, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.card,
          padding: space.lg,
          gap: space.lg,
          ...shadow.raised,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: space.sm,
          }}
        >
          <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
            INSTALL CAIRN
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.canvas,
              borderColor: colors.hairline,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={colors.ink} strokeWidth={1.75} />
          </Pressable>
        </View>

        {isIOS ? (
          <>
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: 36,
                  color: colors.ink,
                  letterSpacing: -0.6,
                  lineHeight: 40,
                }}
              >
                A real app,{' '}
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular_Italic',
                    color: colors.accent,
                    fontSize: 36,
                    letterSpacing: -0.6,
                  }}
                >
                  in two taps.
                </Text>
              </Text>
              <Text variant="body" soft style={{ marginTop: 4, lineHeight: 22 }}>
                What you'll get isn't a browser bookmark — it's Cairn on
                your home screen as a full-screen app icon. No tabs, no
                Safari chrome. Apple makes us route through their Share
                menu for this, but the result is the real thing.
              </Text>
            </View>

            <View style={{ gap: space.sm, marginTop: space.xs }}>
              <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'baseline' }}>
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular',
                    fontSize: 28,
                    color: colors.accent,
                    letterSpacing: -0.3,
                  }}
                >
                  1
                </Text>
                <Text variant="body" style={{ fontWeight: '600', fontSize: 17, flex: 1 }}>
                  Tap the Share button at the bottom of Safari
                </Text>
              </View>
              <View
                style={{
                  padding: space.lg,
                  backgroundColor: colors.canvas,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  borderRadius: layout.radius.card,
                  alignItems: 'center',
                  gap: space.xs,
                }}
              >
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: layout.radius.card,
                    backgroundColor: colors.card,
                    borderColor: colors.hairline,
                    borderWidth: 1.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Share size={42} color={colors.ink} strokeWidth={1.5} />
                </View>
                <Text variant="caption" style={{ fontWeight: '600', fontSize: 12 }}>
                  Looks like this — square with an up-arrow
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'center',
                paddingVertical: space.md,
                paddingHorizontal: space.md,
                backgroundColor: colors.canvas,
                borderColor: colors.hairline,
                borderWidth: 1,
                borderRadius: layout.radius.card,
              }}
            >
              <Text
                style={{
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: 28,
                  color: colors.accent,
                  letterSpacing: -0.3,
                }}
              >
                2
              </Text>
              <ArrowDown size={20} color={colors.ink} strokeWidth={1.75} />
              <Text variant="body" style={{ fontWeight: '600', fontSize: 17, flex: 1 }}>
                Scroll down → "Add to Home Screen"
              </Text>
            </View>
          </>
        ) : (
          // Android fallback — Chrome's beforeinstallprompt either hasn't
          // fired yet (engagement gate) or the user is in an embedded
          // webview. Show the manual ⋮-menu path.
          <>
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: 36,
                  color: colors.ink,
                  letterSpacing: -0.6,
                  lineHeight: 40,
                }}
              >
                Almost — give Chrome{' '}
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular_Italic',
                    color: colors.accent,
                    fontSize: 36,
                    letterSpacing: -0.6,
                  }}
                >
                  a moment.
                </Text>
              </Text>
              <Text variant="body" soft style={{ marginTop: 4, lineHeight: 22 }}>
                Chrome waits for you to interact with the page for a few
                seconds before it lets sites trigger install. Browse
                Cairn briefly, then tap Install again — the native
                install dialog will pop up.
              </Text>
            </View>

            <Text
              variant="caption"
              soft
              style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11, marginTop: space.sm }}
            >
              OR INSTALL MANUALLY
            </Text>
            <View
              style={{
                padding: space.md,
                backgroundColor: colors.canvas,
                borderColor: colors.hairline,
                borderWidth: 1,
                borderRadius: layout.radius.card,
                flexDirection: 'row',
                gap: space.sm,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: layout.radius.card,
                  backgroundColor: colors.card,
                  borderColor: colors.hairline,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MoreVertical size={28} color={colors.ink} strokeWidth={1.75} />
              </View>
              <Text variant="body" style={{ flex: 1, lineHeight: 22 }}>
                Tap Chrome's <Text style={{ fontWeight: '700' }}>⋮ menu</Text> (top-right) →{' '}
                <Text style={{ fontWeight: '700' }}>Install app</Text>
              </Text>
            </View>
          </>
        )}

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Got it"
          style={{
            backgroundColor: colors.ink,
            paddingVertical: space.md,
            borderRadius: layout.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
          }}
        >
          <Text variant="button" color="#FFFFFF">
            Got it
          </Text>
        </Pressable>
      </MotiView>
    </View>
  );
}

export function InstallBannerInner() {
  const { colors } = useTheme();
  const { device, isStandalone, canPromptInstall, promptInstall } = usePWAState();
  const { dismissed, dismiss } = useDismissed('banner');
  const [showInstructions, setShowInstructions] = useState(false);

  if (Platform.OS !== 'web') return null;
  if (isStandalone) return null;
  if (device === 'desktop' || device === 'native') return null;
  if (dismissed) return null;
  // Android: only surface the banner when Chrome is actually ready to
  // fire the native install dialog (`beforeinstallprompt` captured).
  // Founder feedback was that tapping install when Chrome wasn't ready
  // showed a manual walkthrough — "browser shortcut" energy — when they
  // wanted the real OS install prompt (like FounderOS / other PWAs do).
  // Hiding the banner until canPromptInstall=true guarantees that EVERY
  // tap on Install lands in the native OS dialog. The banner appears
  // automatically when Chrome's engagement heuristic fires the event
  // (typically after a few seconds of page interaction).
  if (device === 'mobile-android' && !canPromptInstall) return null;

  const onInstallTap = async () => {
    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted' || outcome === 'dismissed') dismiss();
      return;
    }
    // iOS only path — Apple doesn't support programmatic install, so
    // the Share-menu walkthrough is the only option. Android never
    // reaches this branch (gated above).
    setShowInstructions(true);
  };

  const subtitle =
    device === 'mobile-ios'
      ? 'A real app on your home screen'
      : canPromptInstall
        ? 'One tap, full-screen, works offline'
        : 'Full-screen, works offline';

  return (
    <>
      <MotiView
        from={{ translateY: 120, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
        style={{
          position: 'absolute' as any,
          left: space.md,
          right: space.md,
          bottom: space.md + 56,
          zIndex: 50,
          backgroundColor: colors.ink,
          borderRadius: layout.radius.card,
          paddingVertical: space.sm,
          paddingHorizontal: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          ...shadow.raised,
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Smartphone size={18} color="#FFFFFF" strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="body" color="#FFFFFF" style={{ fontWeight: '600', fontSize: 14 }}>
            Install Cairn
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.65)" style={{ fontSize: 12 }}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          onPress={onInstallTap}
          accessibilityRole="button"
          accessibilityLabel="Install"
          style={{
            backgroundColor: colors.accent,
            paddingHorizontal: space.md,
            paddingVertical: space.xs,
            borderRadius: layout.radius.full,
            minHeight: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '700', letterSpacing: 0.2, fontSize: 12 }}>
            Install
          </Text>
        </Pressable>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} color="rgba(255,255,255,0.65)" strokeWidth={1.75} />
        </Pressable>
      </MotiView>

      {showInstructions && (
        <InstallInstructions device={device} onClose={() => setShowInstructions(false)} />
      )}
    </>
  );
}

export function InstallBanner() {
  return (
    <ThemeProvider mode="career">
      <InstallBannerInner />
    </ThemeProvider>
  );
}
