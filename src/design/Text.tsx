/**
 * Typographic primitives. Fraunces = the companion's warm voice + the
 * life-garden narrative. Nunito = friendly UI/body/labels. Body never < 16.
 */
import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from './theme';
import { type } from './tokens';

type Variant =
  | 'display' // big warm companion moments
  | 'voice' // companion speaking (Fraunces)
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
      return { fontFamily: family.voiceBold, fontSize: size.display, lineHeight: size.display * lineHeight.heading };
    case 'voice':
      return { fontFamily: family.voice, fontSize: size.lede, lineHeight: size.lede * lineHeight.body };
    case 'h1':
      return { fontFamily: family.voiceBold, fontSize: size.h1, lineHeight: size.h1 * lineHeight.heading };
    case 'h2':
      return { fontFamily: family.voiceBold, fontSize: size.h2, lineHeight: size.h2 * lineHeight.heading };
    case 'h3':
      return { fontFamily: family.uiBold, fontSize: size.h3, lineHeight: size.h3 * lineHeight.heading };
    case 'lede':
      return { fontFamily: family.ui, fontSize: size.lede, lineHeight: size.lede * lineHeight.body };
    case 'label':
      return { fontFamily: family.uiSemibold, fontSize: size.body, lineHeight: size.body * 1.3 };
    case 'button':
      return { fontFamily: family.uiBold, fontSize: size.body, lineHeight: size.body * 1.1, letterSpacing: 0.2 };
    case 'caption':
      return { fontFamily: family.ui, fontSize: size.caption, lineHeight: size.caption * 1.4 };
    case 'body':
    default:
      return { fontFamily: family.ui, fontSize: size.body, lineHeight: size.body * lineHeight.body };
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
