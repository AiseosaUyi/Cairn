/**
 * Mobile PWA install banner — sticky bottom strip on mobile web.
 *
 * Renders only when:
 *   - Running on web (mobile UA)
 *   - Not already installed (standalone display-mode false)
 *   - User hasn't dismissed for this session
 *
 * Behavior splits by platform:
 *   - Android / Chrome / Edge: fires the captured `beforeinstallprompt`
 *     for a native OS install dialog (one tap).
 *   - iOS Safari: no native install event exists. We show the
 *     instruction overlay ("Tap Share → Add to Home Screen") with a
 *     small icon walkthrough.
 *
 * Closes via the small × on the right (sessionStorage dismiss — banner
 * returns next visit, not nagging within the same session).
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

/**
 * Fallback instructions — only opens when the browser can't install
 * programmatically (no `beforeinstallprompt`). Full-screen modal so the
 * Share/menu icon can render BIG as the visual answer to "what share
 * button?" — naming alone is ambiguous across browsers, but the icon
 * shape (square with up-arrow on iOS, three-dot menu on others) is
 * universal. Browser-agnostic copy.
 */
function InstallInstructions({
  device,
  onClose,
}: {
  device: 'mobile-ios' | 'mobile-android' | 'desktop' | 'native';
  onClose: () => void;
}) {
  const { colors } = useTheme();
  // iOS-WebKit family → Share menu pattern (the actual Share button is a
  // square with an up-arrow, lives in the browser toolbar). Everything
  // else → browser overflow menu (the three-dot icon).
  const isIOS = device === 'mobile-ios';
  const HintIcon = isIOS ? Share : MoreVertical;
  const buttonName = isIOS ? 'Share' : 'menu';
  const hint = isIOS
    ? 'Look for it in your browser toolbar — it usually sits at the bottom on phones, top on tablets and desktop.'
    : 'It looks like three dots and lives at the top-right (or bottom) of your browser.';
  const step2 = isIOS
    ? 'Choose "Add to Home Screen"'
    : 'Choose "Install app" (or "Add to Home Screen")';

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
            INSTALL TRUESELF
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

        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 36,
            color: colors.ink,
            letterSpacing: -0.6,
            lineHeight: 40,
          }}
        >
          Two taps,{' '}
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular_Italic',
              color: colors.accent,
              fontSize: 36,
              letterSpacing: -0.6,
            }}
          >
            and you're in.
          </Text>
        </Text>

        {/* Step 1 — big icon hero so "what share button" is answered by the icon */}
        <View style={{ gap: space.sm, marginTop: space.sm }}>
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
            <Text
              variant="body"
              style={{ fontWeight: '600', fontSize: 17, flex: 1 }}
            >
              Tap the {buttonName} button in your browser
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
              <HintIcon size={42} color={colors.ink} strokeWidth={1.5} />
            </View>
            <Text
              variant="caption"
              style={{ fontWeight: '600', letterSpacing: 0.2, fontSize: 12 }}
            >
              Looks like this →
            </Text>
            <Text variant="caption" soft style={{ textAlign: 'center', fontSize: 12, lineHeight: 18, maxWidth: 320 }}>
              {hint}
            </Text>
          </View>
        </View>

        {/* Step 2 */}
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
          <Text
            variant="body"
            style={{ fontWeight: '600', fontSize: 17, flex: 1 }}
          >
            {step2}
          </Text>
        </View>

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
        <Text variant="caption" soft style={{ textAlign: 'center', fontSize: 12 }}>
          Cairn opens like a native app — full-screen, no browser chrome.
        </Text>
      </MotiView>
    </View>
  );
}

export function InstallBannerInner() {
  const { colors } = useTheme();
  const { device, isStandalone, canPromptInstall, promptInstall } = usePWAState();
  const { dismissed, dismiss } = useDismissed('banner');
  const [showInstructions, setShowInstructions] = useState(false);

  // Native binary + already installed → render nothing.
  if (Platform.OS !== 'web') return null;
  if (isStandalone) return null;
  if (device === 'desktop' || device === 'native') return null;
  if (dismissed) return null;

  // Single "Install" path: try the OS dialog first, fall through to
  // instructions only when the browser can't install programmatically.
  // This is the right UX regardless of browser/OS — the user shouldn't
  // need to know what their browser supports.
  const onInstallTap = async () => {
    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted' || outcome === 'dismissed') dismiss();
      return;
    }
    setShowInstructions(true);
  };

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
          bottom: space.md + 56, // sit above the slim floating tab bar in-app
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
            Faster, full-screen, works offline.
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

/** Wraps in a theme provider so the banner can render at the root layout
 *  level (outside any ThemeProvider scope from a mode shell). */
export function InstallBanner() {
  return (
    <ThemeProvider mode="career">
      <InstallBannerInner />
    </ThemeProvider>
  );
}
