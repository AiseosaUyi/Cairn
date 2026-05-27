/**
 * Cairn brand mark — three stacked stones, the literal metaphor.
 *
 * Pairs with the "Cairn" wordmark across the brand:
 *   <CairnMark size={20} /> <Text variant="display">Cairn</Text>
 *
 * Drawn as a flat SVG so it tints with currentColor — same mark works
 * on cream, dark, or accent surfaces by passing the right `color`.
 * Pixel-honest at 16/20/24/32; scales smoothly above that.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/design/theme';

export function CairnMark({
  size = 20,
  color,
  strokeWidth = 1.6,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const { colors } = useTheme();
  const stroke = color ?? colors.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Base stone — wide oblong */}
      <Path
        d="M3 19 C 3 17, 5 16, 8 16 L 16 16 C 19 16, 21 17, 21 19 C 21 20, 19 20.5, 16 20.5 L 8 20.5 C 5 20.5, 3 20, 3 19 Z"
        fill={stroke}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Middle stone — narrower, slightly offset */}
      <Path
        d="M6 13.5 C 6 12, 7.5 11, 10 11 L 15 11 C 17 11, 18 12, 18 13.5 C 18 14.5, 17 15, 15 15 L 10 15 C 7.5 15, 6 14.5, 6 13.5 Z"
        fill={stroke}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Top stone — small cap */}
      <Path
        d="M9 9.5 C 9 8, 10 7, 12 7 C 14 7, 15 8, 15 9.5 C 15 10.5, 14 11, 12 11 C 10 11, 9 10.5, 9 9.5 Z"
        fill={stroke}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
