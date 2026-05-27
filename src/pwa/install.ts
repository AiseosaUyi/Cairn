/**
 * PWA install detection + prompt control.
 *
 * Web-only behavior — on native (iOS/Android binaries), all of these are
 * no-ops that report "already installed". The hooks branch on
 * `Platform.OS` so screens can render install UI unconditionally; the
 * components decide whether to show themselves.
 *
 * Detection covers:
 *   - Standalone mode (already installed → never prompt)
 *   - iOS Safari (no `beforeinstallprompt` event; user must use the Share
 *     menu — we surface visual instructions for that path)
 *   - Android Chrome / Edge / Samsung Internet (fires
 *     `beforeinstallprompt` which `app/+html.tsx` captures into
 *     `window.__deferredInstallPrompt`)
 *   - Desktop (real install possible on Chrome/Edge; we still recommend
 *     opening on phone for the best ergonomics)
 *
 * Dismiss persistence is in localStorage; the banner remembers per-session,
 * the modal remembers permanently until storage is cleared.
 */
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

const BANNER_DISMISS_KEY = 'cairn.pwa.banner.dismissed';
const MODAL_DISMISS_KEY = 'cairn.pwa.modal.dismissed';

export type DeviceKind = 'mobile-ios' | 'mobile-android' | 'desktop' | 'native';

export interface PWAState {
  /** Underlying device family. */
  device: DeviceKind;
  /** Already running as an installed PWA (or native build). */
  isStandalone: boolean;
  /** `beforeinstallprompt` was captured — we can fire the OS install dialog. */
  canPromptInstall: boolean;
  /** Trigger the captured install prompt. Returns user's outcome string. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

function readDevice(): DeviceKind {
  if (Platform.OS !== 'web') return 'native';
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !(globalThis as any).MSStream) return 'mobile-ios';
  if (/Android/i.test(ua)) return 'mobile-android';
  if (/Mobi|Mobile/i.test(ua)) return 'mobile-android';
  return 'desktop';
}

function readStandalone(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  // Chrome / Edge / Android
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari sets navigator.standalone on home-screen-installed PWAs
  if ((navigator as any).standalone === true) return true;
  return false;
}

export function usePWAState(): PWAState {
  const [device] = useState<DeviceKind>(() => readDevice());
  const [isStandalone] = useState<boolean>(() => readStandalone());
  const [canPromptInstall, setCanPromptInstall] = useState<boolean>(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).__deferredInstallPrompt,
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onAvailable = () => setCanPromptInstall(true);
    const onInstalled = () => setCanPromptInstall(false);
    window.addEventListener('cairn:install-available', onAvailable);
    window.addEventListener('cairn:installed', onInstalled);
    return () => {
      window.removeEventListener('cairn:install-available', onAvailable);
      window.removeEventListener('cairn:installed', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return 'unavailable' as const;
    const evt = (window as any).__deferredInstallPrompt as
      | { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
      | null;
    if (!evt) return 'unavailable' as const;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      (window as any).__deferredInstallPrompt = null;
      setCanPromptInstall(false);
      return choice.outcome;
    } catch {
      return 'dismissed';
    }
  }, []);

  return { device, isStandalone, canPromptInstall, promptInstall };
}

// ---------------------------------------------------------------------------
// Dismiss persistence — banner dismisses per-session (sessionStorage),
// modal dismisses persistently (localStorage). Tradeoff: banner stays
// gentle (returns next visit); modal is once-and-done.
// ---------------------------------------------------------------------------

export function useDismissed(key: 'banner' | 'modal') {
  const storeKey = key === 'banner' ? BANNER_DISMISS_KEY : MODAL_DISMISS_KEY;
  const store = (): Storage | null => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    try {
      return key === 'banner' ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  };

  const [dismissed, setDismissed] = useState<boolean>(() => {
    const s = store();
    if (!s) return false;
    try {
      return s.getItem(storeKey) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    const s = store();
    if (!s) return;
    try {
      s.setItem(storeKey, '1');
    } catch {
      /* ignore */
    }
  }, [storeKey]);

  return { dismissed, dismiss };
}

// ---------------------------------------------------------------------------
// "Send the link to my phone" helpers used by the desktop modal. Uses
// platform share APIs where available; falls back to mailto/sms intents.
// ---------------------------------------------------------------------------

export async function sharePhoneLink(url: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: 'Cairn',
        text: 'Open this on your phone to install Cairn',
        url,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}
