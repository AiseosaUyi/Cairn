/**
 * Desktop "open on your phone" modal — first-visit recommendation that
 * Cairn is best as a PWA on a phone. Always escapable ("Continue on
 * web") and never re-shown after dismiss (localStorage-persisted).
 *
 * Renders only on web + desktop + not-yet-dismissed + not-standalone.
 *
 * The QR code uses an external service for the design pass
 * (api.qrserver.com — free, no auth, returns PNG). Production should
 * swap to a local `qrcode` npm dep for offline reliability.
 */
import { Platform, Pressable, View } from 'react-native';
import { useState } from 'react';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ArrowRight, Check, Copy, Download, Share2, Smartphone, X } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { copyToClipboard, sharePhoneLink, useDismissed, usePWAState } from '@/pwa/install';

function qrUrl(target: string, size = 220) {
  return (
    `https://api.qrserver.com/v1/create-qr-code/?` +
    `size=${size}x${size}&data=${encodeURIComponent(target)}&bgcolor=F8F7F4&color=0E0D0B&margin=0`
  );
}

function InstallModalInner() {
  const { colors } = useTheme();
  const { device, isStandalone, canPromptInstall, promptInstall } = usePWAState();
  const { dismissed, dismiss } = useDismissed('modal');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (Platform.OS !== 'web') return null;
  if (isStandalone) return null;
  if (device !== 'desktop') return null;
  if (dismissed) return null;

  const targetUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://cairn.app/';

  const onCopy = async () => {
    const ok = await copyToClipboard(targetUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const onShare = async () => {
    const ok = await sharePhoneLink(targetUrl);
    if (ok) {
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    }
  };

  const onInstall = async () => {
    if (!canPromptInstall) return;
    const outcome = await promptInstall();
    if (outcome === 'accepted') dismiss();
  };

  return (
    <View
      style={{
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(14,13,11,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.lg,
        zIndex: 200,
      }}
    >
      <MotiView
        from={{ opacity: 0, translateY: 16, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
        style={{
          width: '100%',
          maxWidth: 560,
          backgroundColor: colors.card,
          borderRadius: layout.radius.sheet,
          overflow: 'hidden',
          ...shadow.raised,
        }}
      >
        {/* Top band */}
        <View
          style={{
            backgroundColor: colors.ink,
            padding: space.lg,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: space.md,
          }}
        >
          <View style={{ flex: 1, gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Smartphone size={14} color={colors.accent} strokeWidth={2} />
              <Text
                variant="caption"
                color={colors.accent}
                style={{ letterSpacing: 0.6, fontWeight: '700', fontSize: 11 }}
              >
                BUILT FOR YOUR PHONE
              </Text>
            </View>
            <Text
              color="#FFFFFF"
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 32,
                lineHeight: 36,
                letterSpacing: -0.5,
              }}
            >
              Cairn works best{' '}
              <Text
                style={{
                  fontFamily: 'InstrumentSerif_400Regular_Italic',
                  color: colors.accent,
                  fontSize: 32,
                  letterSpacing: -0.5,
                }}
              >
                where you are.
              </Text>
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>
              Your career path is a daily thing. Installing the app puts a
              full-screen home-screen icon on your phone — no tabs, no
              browser chrome, opens like a native app.
            </Text>
          </View>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#FFFFFF" strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* Body — QR + send-to-phone actions */}
        <View style={{ padding: space.lg, gap: space.lg, flexDirection: 'row' }}>
          <View
            style={{
              width: 168,
              height: 168,
              borderRadius: layout.radius.card,
              backgroundColor: colors.canvas,
              borderColor: colors.hairline,
              borderWidth: 1,
              padding: space.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl(targetUrl, 220)}
              width={148}
              height={148}
              alt="Scan to open Cairn on your phone"
              style={{ display: 'block' }}
            />
          </View>

          <View style={{ flex: 1, gap: space.sm }}>
            <Text variant="caption" soft style={{ letterSpacing: 0.5, fontWeight: '600', fontSize: 11 }}>
              SCAN WITH YOUR PHONE CAMERA
            </Text>
            <Text variant="body" soft style={{ lineHeight: 22 }}>
              Or send yourself the link — you'll see an "Install" prompt
              once it opens.
            </Text>

            <View style={{ gap: space.xs, marginTop: space.xs }}>
              <Pressable
                onPress={onCopy}
                accessibilityRole="button"
                accessibilityLabel="Copy link"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: layout.radius.full,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  minHeight: 36,
                }}
              >
                {copied ? (
                  <Check size={14} color={colors.encourage} strokeWidth={2} />
                ) : (
                  <Copy size={14} color={colors.ink} strokeWidth={1.75} />
                )}
                <Text variant="caption" style={{ fontWeight: '600', fontSize: 12 }}>
                  {copied ? 'Copied' : 'Copy link'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share link"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: layout.radius.full,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  minHeight: 36,
                }}
              >
                <Share2 size={14} color={colors.ink} strokeWidth={1.75} />
                <Text variant="caption" style={{ fontWeight: '600', fontSize: 12 }}>
                  {shared ? 'Shared' : 'Share link'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Footer — install-on-desktop (if capable) + continue-on-web */}
        <View
          style={{
            padding: space.lg,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            gap: space.sm,
          }}
        >
          {canPromptInstall && (
            <Pressable
              onPress={onInstall}
              accessibilityRole="button"
              accessibilityLabel="Install on this device"
              style={{
                backgroundColor: colors.accent,
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                borderRadius: layout.radius.full,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                minHeight: 48,
                ...shadow.raised,
              }}
            >
              <Download size={16} color="#FFFFFF" strokeWidth={2} />
              <Text variant="button" color="#FFFFFF">
                Install on this device
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Continue on web"
            style={{
              paddingVertical: space.md,
              paddingHorizontal: space.lg,
              borderRadius: layout.radius.full,
              borderColor: colors.hairline,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.xs,
              minHeight: 48,
            }}
          >
            <Text variant="button" color={colors.ink}>
              Continue on web
            </Text>
            <ArrowRight size={14} color={colors.ink} strokeWidth={1.75} />
          </Pressable>
          <Text variant="caption" soft style={{ textAlign: 'center', fontSize: 11 }}>
            Web version is fully featured. The phone install is just better
            ergonomically — and it works offline.
          </Text>
        </View>
      </MotiView>
    </View>
  );
}

export function InstallModal() {
  return (
    <ThemeProvider mode="career">
      <InstallModalInner />
    </ThemeProvider>
  );
}
