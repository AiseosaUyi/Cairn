/**
 * Typographic primitives.
 *
 * Mature Consumer (2026-05-26): Inter is the workhorse — UI, body, headings,
 * labels, buttons. Instrument Serif appears ONLY as `voice` (companion
 * speaking) and `display` (one editorial moment per screen). Used rarely
 * so it stays special — overuse turns the system back to indie-bookshop.
 *
 * Body floor 16 (a11y locked). Heading line-height 1.15, body 1.55.
 * Negative letter-spacing on display/headings tightens the Inter rhythm
 * the way premium consumer apps do.
 */
import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from './theme';
import { type } from './tokens';

type Variant =
  | 'display' // one editorial moment per screen — Instrument Serif
  | 'voice' // companion speaking — Instrument Serif
  | 'h1'
  | 'h2'
  | 'h3'
  | 'lede'
  | 'body'
  | 'label'
  | 'button'
  | 'caption';

const styleFor = (v: Variant): TextStyle => {
  const { family, size, lineHeight } = type;
  switch (v) {
    case 'display':
      return {
        fontFamily: family.voice,
        fontSize: size.display,
        lineHeight: size.display * lineHeight.heading,
        letterSpacing: -0.8,
      };
    case 'voice':
      return {
        fontFamily: family.voice,
        fontSize: size.lede,
        lineHeight: size.lede * lineHeight.body,
        letterSpacing: 0,
      };
    case 'h1':
      return {
        fontFamily: family.uiBold,
        fontSize: size.h1,
        lineHeight: size.h1 * lineHeight.heading,
        letterSpacing: -0.6,
      };
    case 'h2':
      return {
        fontFamily: family.uiSemibold,
        fontSize: size.h2,
        lineHeight: size.h2 * lineHeight.heading,
        letterSpacing: -0.4,
      };
    case 'h3':
      return {
        fontFamily: family.uiSemibold,
        fontSize: size.h3,
        lineHeight: size.h3 * lineHeight.heading,
        letterSpacing: -0.2,
      };
    case 'lede':
      return {
        fontFamily: family.ui,
        fontSize: size.lede,
        lineHeight: size.lede * lineHeight.body,
        letterSpacing: -0.1,
      };
    case 'label':
      return {
        fontFamily: family.uiMedium,
        fontSize: size.caption,
        lineHeight: size.caption * 1.4,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      };
    case 'button':
      return {
        fontFamily: family.uiSemibold,
        fontSize: size.body,
        lineHeight: size.body * 1.15,
        letterSpacing: -0.1,
      };
    case 'caption':
      return {
        fontFamily: family.ui,
        fontSize: size.caption,
        lineHeight: size.caption * 1.5,
        letterSpacing: 0,
      };
    case 'body':
    default:
      return {
        fontFamily: family.ui,
        fontSize: size.body,
        lineHeight: size.body * lineHeight.body,
        letterSpacing: -0.05,
      };
  }
};

export function Text({
  variant = 'body',
  soft = false,
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; soft?: boolean; color?: string }) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[styleFor(variant), { color: color ?? (soft ? colors.inkSoft : colors.ink) }, style]}
      {...rest}
    />
  );
}
