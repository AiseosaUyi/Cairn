/**
 * Garden tab — the life-arc made warm. A growing, tended thing, never a
 * streak. Kept commitments + got-through days become blooms. It only grows
 * or rests; it never wilts as punishment. Words first. Reframes a hard day;
 * never false-cheerleads a real decline.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space } from '@/design/tokens';
import { Card, Rise, Screen } from '@/components/ui';
import { getLifeArc, type LifeArc } from '@/companion/lifearc';

function GardenPath({ series }: { series: number[] }) {
  const { colors } = useTheme();
  if (series.length < 2) return null;
  return (
    <View
      accessibilityLabel="Your garden — it grows as you tend it"
      style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: space.xs, paddingVertical: space.sm }}
    >
      {series.slice(-48).map((v, i) => {
        const size = 8 + (v / 5) * 16;
        return (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: layout.radius.full,
              backgroundColor: v >= 3 ? colors.encourage : colors.accent,
              opacity: 0.35 + (v / 5) * 0.5,
            }}
          />
        );
      })}
    </View>
  );
}

export default function Garden() {
  const [arc, setArc] = useState<LifeArc | null>(null);
  useFocusEffect(
    useCallback(() => {
      getLifeArc().then(setArc);
    }, []),
  );

  return (
    <Screen>
      <Rise>
        <Text variant="h2">Our garden</Text>
      </Rise>
      {arc?.reframe && (
        <Rise delay={60}>
          <Card tone="wash">
            <Text variant="voice">{arc.reframe}</Text>
          </Card>
        </Rise>
      )}
      {arc && arc.trend.length >= 2 && (
        <Rise delay={120}>
          <Card>
            <Text variant="caption" soft>
              Everything you’ve tended so far
            </Text>
            <GardenPath series={arc.trend} />
          </Card>
        </Rise>
      )}
      <View style={{ gap: space.lg, marginTop: space.sm }}>
        {arc && arc.moments.length === 0 && (
          <Rise delay={180}>
            <Text variant="voice" soft>
              This is where our story grows — the things you said you’d do and
              did, the hard days you got through. It starts the first time you
              show up. That’s today. No pressure, no streak. Just us, planting.
            </Text>
          </Rise>
        )}
        {arc?.moments.map((m, i) => (
          <Rise key={m.id} delay={180 + i * 40}>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 10,
                  backgroundColor: '#3F9A6E',
                }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="voice">{m.text}</Text>
                <Text variant="caption" soft>
                  {new Date(m.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Rise>
        ))}
      </View>
    </Screen>
  );
}
