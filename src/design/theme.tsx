/**
 * Theme = active mode + color scheme resolved to a concrete palette.
 *
 * Mode-as-place: the active mode recolors the whole world. Theme is read from
 * the mode the user is currently inside, never blended across modes.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palette, type Mode, type Palette, type Scheme } from './tokens';

type ThemeValue = {
  mode: Mode;
  scheme: Scheme;
  colors: Palette;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({
  mode,
  children,
}: {
  mode: Mode;
  children: React.ReactNode;
}) {
  // Locked to light: the warm cream world is the brand. Dark tokens still
  // exist for a future opt-in, but the app does not follow the OS theme.
  useColorScheme(); // kept so a future setting can re-enable system theming
  const scheme: Scheme = 'light';
  const value = useMemo<ThemeValue>(
    () => ({ mode, scheme, colors: palette(mode, scheme) }),
    [mode, scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}
