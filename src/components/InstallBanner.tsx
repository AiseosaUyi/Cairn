/**
 * PWA install banner — the SINGLE install surface.
 *
 * Shows only when an install path actually exists:
 *   - Android Chrome / Edge / Samsung Internet AFTER `beforeinstallprompt`
 *     has fired (captured into `window.__deferredInstallPrompt` by
 *     `app/+html.tsx`). Tap → native OS install dialog.
 *   - iOS Safari (no programmatic install — Apple constraint). Tap →
 *     expand the banner inline with the Share → Add to Home Screen hint.
 *     No second modal sheet stacked on top.
 *
 * Hidden in every other case (already-installed PWA, native app build,
 * desktop, Android pre-engagement before Chrome fires the prompt,
 * recently dismissed). Hiding when uninstallable is intentional — a
 * banner that can't actually install is just noise.
 *
 * Conditions Chrome uses before firing `beforeinstallprompt`
 * (debugging "why doesn't it install"):
 *   - Served over HTTPS (or localhost)
 *   - Linked manifest with name, short_name, start_url, icons (192 + 512),
 *     display: standalone | minimal-ui
 *   - Registered, active service worker with a fetch handler
 *   - Not already installed
 *   - Some user engagement (Chrome heuristic: usually a few seconds + an
 *     interaction). Open the page, wait, tap once — banner appears.
 *   - On supported browser/OS combos (Firefox / Safari desktop don't
 *     support programmatic install at all).
 */
import { Platform, Pressable, View } from 'react-native';
import { useState } from 'react';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Share, Smartphone, X } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { usePWAState, useDismissed } from '@/pwa/install';

export function InstallBannerInner() {
  const { colors } = useTheme();
  const { device, isStandalone, canPromptInstall, promptInstall } = usePWAState();
  const { dismissed, dismiss } = useDismissed('banner');
  const [iosExpanded, setIosExpanded] = useState(false);

  if (Platform.OS !== 'web') return null;
  if (isStandalone) return null;
  if (device === 'desktop' || device === 'native') return null;
  if (dismissed) return null;

  // Only render when there's an actual install path. On Android we wait
  // for Chrome to fire `beforeinstallprompt` (otherwise a tap goes
  // nowhere). On iOS we always render because Share → Add to Home Screen
  // is always available.
  const installable = canPromptInstall || device === 'mobile-ios';
  if (!installable) return null;

  const onInstallTap = async () => {
    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted' || outcome === 'dismissed') dismiss();
      return;
    }
    // iOS: expand inline to show the share hint — no second modal.
    setIosExpanded((v) => !v);
  };

  const subtitle =
    device === 'mobile-ios'
      ? 'A real app on your home screen'
      : 'One tap, full-screen, works offline';

  return (
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
        gap: space.sm,
        ...shadow.raised,
      }}
      pointerEvents="box-none"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
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
          accessibilityLabel={device === 'mobile-ios' ? 'How to install on iOS' : 'Install'}
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
      </View>

      {iosExpanded && device === 'mobile-ios' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingVertical: space.sm,
            paddingHorizontal: space.sm,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: layout.radius.control,
          }}
        >
          <Share size={18} color="#FFFFFF" strokeWidth={1.75} />
          <Text variant="caption" color="#FFFFFF" style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
            Tap Safari's <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Share</Text> →{' '}
            <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Add to Home Screen</Text>
          </Text>
        </View>
      )}
    </MotiView>
  );
}

export function InstallBanner() {
  return (
    <ThemeProvider mode="career">
      <InstallBannerInner />
    </ThemeProvider>
  );
}
