/**
 * Per-mode shell. mode-as-place: the active mode recolors the whole world.
 * Within a mode the user gets real app navigation (tabs).
 *
 * v3 (2026-05-26): goal-first IA — Today (home) → Goals (path detail) →
 * Chat → You. Custom floating tab bar contained to the content column with
 * icons + labels, soft elevation. No emoji.
 *
 * Career-only launch (CEO plan 2026-05-26): `[mode]` route preserved for
 * engine reasons; health redirects to /career.
 */
import { Redirect, Tabs, useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import {
  CalendarCheck,
  Compass,
  MessageCircle,
  CircleUserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import type { Mode } from '@/design/tokens';
import { healthDomainAvailable } from '@/safety/healthGuardrails';

const VALID: Mode[] = ['career', 'health'];

type TabDef = {
  route: string;
  label: string;
  icon: LucideIcon;
};

const TABS: TabDef[] = [
  { route: 'index', label: 'Today', icon: CalendarCheck },
  { route: 'goals', label: 'Goals', icon: Compass },
  { route: 'chat', label: 'Chat', icon: MessageCircle },
  { route: 'you', label: 'You', icon: CircleUserRound },
];

function TabButton({
  def,
  focused,
  onPress,
}: {
  def: TabDef;
  focused: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const Icon = def.icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={def.label}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 4,
      }}
    >
      <MotiView
        animate={{ backgroundColor: focused ? colors.ink : 'transparent' }}
        transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
        style={{
          width: 28,
          height: 28,
          borderRadius: layout.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} strokeWidth={focused ? 2.25 : 1.75} color={focused ? '#FFFFFF' : colors.inkSoft} />
      </MotiView>
      {focused && (
        <Text
          variant="caption"
          style={{
            fontSize: 12,
            color: colors.ink,
            fontWeight: '600',
            letterSpacing: -0.1,
          }}
        >
          {def.label}
        </Text>
      )}
    </Pressable>
  );
}

function FloatingTabBar({ mode }: { mode: Mode }) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  // Resolve current tab: pathname looks like "/career", "/career/goals", etc.
  // /career → index (Today). /career/<x> → <x>.
  const stripped = pathname.replace(`/${mode}`, '');
  const current = stripped === '' || stripped === '/' ? 'index' : stripped.replace(/^\//, '');

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: space.md,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          width: '92%',
          maxWidth: layout.maxContentWidth - space.lg,
          backgroundColor: colors.card,
          borderRadius: layout.radius.full,
          borderWidth: 1,
          borderColor: colors.hairline,
          paddingHorizontal: 4,
          paddingVertical: 4,
          ...shadow.raised,
        }}
      >
        {TABS.map((def) => {
          const focused = def.route === current;
          return (
            <TabButton
              key={def.route}
              def={def}
              focused={focused}
              onPress={() => {
                const target = def.route === 'index' ? `/${mode}` : `/${mode}/${def.route}`;
                router.navigate(target as any);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function ModeLayout() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (!VALID.includes(mode as Mode)) return <Redirect href="/onboarding" />;
  if (mode === 'health' && !healthDomainAvailable().ok) {
    return <Redirect href="/career" />;
  }
  return (
    <ThemeProvider mode={mode as Mode}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            // Hide the default RN tab bar — we render our own floating one.
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="goals" />
          <Tabs.Screen name="chat" />
          <Tabs.Screen name="you" />
          {/* Routes still present in the file tree but hidden from nav */}
          <Tabs.Screen name="checkin" options={{ href: null }} />
          <Tabs.Screen name="garden" options={{ href: null }} />
          <Tabs.Screen name="setup" options={{ href: null }} />
          <Tabs.Screen name="task/[id]" options={{ href: null }} />
        </Tabs>
        <FloatingTabBar mode={mode as Mode} />
      </View>
    </ThemeProvider>
  );
}
