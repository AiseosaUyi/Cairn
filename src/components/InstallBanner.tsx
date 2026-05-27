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
import { Share, Smartphone, X } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { CairnMark } from '@/components/CairnMark';
import { usePWAState, useDismissed } from '@/pwa/install';

/**
 * iOS-only brand sheet. Cairn-aesthetic, NOT a multi-step guide.
 *
 * Apple has no programmatic install API for PWAs — Safari's Share menu
 * is the only path, and Safari doesn't expose a JS hook to open it.
 * So this sheet is a single brand-styled card that shows the Share
 * icon + one short action line, then closes. It matches the FounderOS
 * banner aesthetic the founder pointed at, while being honest about
 * the OS limitation.
 *
 * Android never reaches this sheet — its banner tap fires the native
 * Chrome install dialog directly via beforeinstallprompt.
 */
function InstallSheetIOS({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();

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
          backgroundColor: colors.card,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: space.lg,
          paddingBottom: space.xl,
          gap: space.md,
          ...shadow.raised,
        }}
      >
        {/* Drag handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.hairline,
            alignSelf: 'center',
          }}
        />

        {/* Brand mark + app name — feels like a real app install card */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginTop: space.xs,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CairnMark size={32} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 24,
                color: colors.ink,
                letterSpacing: -0.3,
              }}
            >
              Install Cairn
            </Text>
            <Text variant="caption" soft style={{ fontSize: 12, marginTop: 2 }}>
              Real app on your home screen
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={colors.inkSoft} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* One-line action with the Share-icon visual baked in. No
            numbered steps, no second card. Apple's constraint reduced
            to a single line. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingVertical: space.md,
            paddingHorizontal: space.md,
            backgroundColor: colors.canvas,
            borderColor: colors.hairline,
            borderWidth: 1,
            borderRadius: layout.radius.card,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: colors.card,
              borderColor: colors.hairline,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share size={22} color={colors.ink} strokeWidth={1.75} />
          </View>
          <Text variant="body" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            Tap Safari's <Text style={{ fontWeight: '700' }}>Share</Text> →{' '}
            <Text style={{ fontWeight: '700' }}>Add to Home Screen</Text>
          </Text>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Got it"
          style={{
            backgroundColor: colors.accent,
            paddingVertical: space.md,
            borderRadius: layout.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
            ...shadow.raised,
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
  // When the user taps Install on Android but Chrome hasn't fired
  // beforeinstallprompt yet, we flash an inline hint for ~6 seconds.
  // `notReadyTick` is the timestamp of the last failed tap; the
  // subtitle reads "Browse for a moment…" while it's within the window.
  const [notReadyTick, setNotReadyTick] = useState<number>(0);
  const isShowingNotReady = notReadyTick > 0 && Date.now() - notReadyTick < 6000;

  if (Platform.OS !== 'web') return null;
  if (isStandalone) return null;
  if (device === 'desktop' || device === 'native') return null;
  if (dismissed) return null;

  const onInstallTap = async () => {
    if (canPromptInstall) {
      // Android Chrome with beforeinstallprompt captured → native dialog.
      const outcome = await promptInstall();
      if (outcome === 'accepted' || outcome === 'dismissed') dismiss();
      return;
    }
    if (device === 'mobile-ios') {
      // iOS has no programmatic install path; show the brand sheet
      // (one card, not a walkthrough).
      setShowInstructions(true);
      return;
    }
    // Android Chrome but the install event hasn't fired yet. Don't
    // open a guide — surface a brief inline hint by flipping the
    // banner subtitle to "Browse for a moment…" for a few seconds,
    // then revert. User can tap again once Chrome marks installable.
    setNotReadyTick(Date.now());
  };

  const subtitle = isShowingNotReady
    ? 'Browse for a moment, then tap again'
    : device === 'mobile-ios'
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

      {showInstructions && device === 'mobile-ios' && (
        <InstallSheetIOS onClose={() => setShowInstructions(false)} />
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
