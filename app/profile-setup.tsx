/**
 * Profile setup — collected once after sign-up.
 *
 * Five fields:
 *   - Employment status (segmented)
 *   - Company (conditional: shown only for FT / PT / Self-employed)
 *   - Tenure in current role (conditional: shown when company is shown)
 *   - Years of experience (free input, 0–60)
 *   - Country (searchable dropdown — full ISO list)
 *
 * On submit we set profile.profileSetupComplete = true; the router then
 * sends the user to /companion-picker.
 *
 * "Skip for now" is offered — we still need a companion before /career
 * works, so the next stop is /companion-picker either way; skipping
 * just means we don't capture these details up front.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ArrowLeft, ChevronDown, Search, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, motion, shadow, space } from '@/design/tokens';
import { Rise, Screen } from '@/components/ui';
import { AuthErrorBanner, AuthSubmit } from '@/components/auth';
import {
  EMPLOYMENT_STATUSES,
  type EmploymentStatus,
  employmentHasCompany,
  setProfile,
} from '@/profile';
import { COUNTRIES, type Country, flagEmoji, findCountry } from '@/data/countries';

function SegmentedField({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" soft style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 11 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const active = selected === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onSelect(o.id)}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              style={{
                paddingHorizontal: space.md,
                paddingVertical: 10,
                borderRadius: layout.radius.full,
                backgroundColor: active ? colors.ink : 'transparent',
                borderColor: active ? colors.ink : colors.hairline,
                borderWidth: 1.25,
                minHeight: 40,
                justifyContent: 'center',
              }}
            >
              <Text
                variant="caption"
                color={active ? '#FFFFFF' : colors.ink}
                style={{ fontSize: 13, fontWeight: '600' }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PlainField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  hint?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" soft style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 11 }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        style={{
          minHeight: layout.controlHeight,
          borderRadius: layout.radius.control,
          borderColor: focused ? colors.ink : colors.hairline,
          borderWidth: focused ? 1.5 : 1,
          paddingHorizontal: space.md,
          color: colors.ink,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          backgroundColor: colors.canvas,
          // @ts-expect-error web-only outline reset
          outlineWidth: 0,
        }}
      />
      {hint ? (
        <Text variant="caption" soft style={{ fontSize: 12 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function CountryField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (code: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = findCountry(value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" soft style={{ letterSpacing: 0.4, fontWeight: '600', fontSize: 11 }}>
        COUNTRY
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose country"
        style={{
          minHeight: layout.controlHeight,
          borderRadius: layout.radius.control,
          borderColor: colors.hairline,
          borderWidth: 1,
          paddingHorizontal: space.md,
          backgroundColor: colors.canvas,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.sm,
        }}
      >
        {selected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 20 }}>{flagEmoji(selected.code)}</Text>
            <Text variant="body" style={{ fontSize: 16, flex: 1 }} numberOfLines={1}>
              {selected.name}
            </Text>
          </View>
        ) : (
          <Text variant="body" style={{ color: colors.inkSoft, fontSize: 16, flex: 1 }}>
            Select your country
          </Text>
        )}
        <ChevronDown size={18} color={colors.inkSoft} strokeWidth={1.75} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(14,13,11,0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <MotiView
            from={{ translateY: 400 }}
            animate={{ translateY: 0 }}
            transition={{ type: 'timing', duration: motion.duration.medium, easing: Easing.out(Easing.quad) }}
            style={{
              height: '85%',
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              ...shadow.raised,
            }}
          >
            <View
              style={{
                padding: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomColor: colors.hairline,
                borderBottomWidth: 1,
              }}
            >
              <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, color: colors.ink }}>
                Choose your country
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.canvas,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={colors.ink} strokeWidth={1.75} />
              </Pressable>
            </View>

            <View
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderBottomColor: colors.hairline,
                borderBottomWidth: 1,
              }}
            >
              <Search size={18} color={colors.inkSoft} strokeWidth={1.75} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search countries"
                placeholderTextColor={colors.inkSoft}
                autoFocus
                style={{
                  flex: 1,
                  paddingVertical: space.sm,
                  color: colors.ink,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 16,
                  // @ts-expect-error web-only outline reset
                  outlineWidth: 0,
                }}
              />
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <View style={{ padding: space.lg }}>
                  <Text variant="body" soft>
                    No countries match "{query}".
                  </Text>
                </View>
              ) : (
                filtered.map((c) => (
                  <CountryRow
                    key={c.code}
                    country={c}
                    selected={value === c.code}
                    onSelect={() => {
                      onChange(c.code);
                      setOpen(false);
                      setQuery('');
                    }}
                  />
                ))
              )}
            </ScrollView>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

function CountryRow({
  country,
  selected,
  onSelect,
}: {
  country: Country;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={country.name}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: space.md,
        backgroundColor: selected ? colors.washTop : 'transparent',
        borderBottomColor: colors.hairline,
        borderBottomWidth: 1,
      }}
    >
      <Text style={{ fontSize: 22 }}>{flagEmoji(country.code)}</Text>
      <Text
        variant="body"
        style={{ flex: 1, fontSize: 16, fontWeight: selected ? '600' : '400' }}
      >
        {country.name}
      </Text>
    </Pressable>
  );
}

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const [employment, setEmployment] = useState<EmploymentStatus | null>(null);
  const [company, setCompany] = useState('');
  const [tenure, setTenure] = useState('');
  const [years, setYears] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCompany = employmentHasCompany(employment);

  const validate = (): string | null => {
    if (!employment) return 'Pick your current employment status.';
    if (showCompany && company.trim().length < 1) return 'What\'s the name of your company?';
    if (showCompany && tenure.trim().length === 0) return 'Roughly how long have you been there?';
    if (years.trim().length === 0) return 'Add your total years of experience.';
    const yrs = parseInt(years, 10);
    if (Number.isNaN(yrs) || yrs < 0 || yrs > 60) return 'Years must be between 0 and 60.';
    if (!country) return 'Pick your country.';
    return null;
  };

  async function onSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);

    // Parse tenure as "months" — accept "6", "6 months", "2y", "1 year"
    // by extracting the leading number and assuming the user wrote it
    // in months unless they wrote y/yr.
    const tenureMonths = parseTenureToMonths(tenure);

    await setProfile({
      employmentStatus: employment,
      company: showCompany ? company.trim() : null,
      tenureMonths: showCompany ? tenureMonths : null,
      yearsExperience: parseInt(years, 10),
      country,
      profileSetupComplete: true,
    });
    setBusy(false);
    router.replace('/companion-picker?next=/career' as any);
  }

  return (
    <Screen tabSafe={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{
            width: 40,
            height: 40,
            borderRadius: layout.radius.full,
            backgroundColor: colors.card,
            borderColor: colors.hairline,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color={colors.ink} strokeWidth={1.75} />
        </Pressable>
      </View>

      <Rise>
        <View style={{ gap: 6, marginTop: space.sm }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            STEP 2 OF 3
          </Text>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 40, lineHeight: 44, color: colors.ink }}>
            Your{' '}
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.accent, fontSize: 40 }}>
              background.
            </Text>
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <View style={{ gap: space.lg }}>
          <SegmentedField
            label="Employment status"
            options={EMPLOYMENT_STATUSES}
            selected={employment}
            onSelect={(id) => {
              setEmployment(id as EmploymentStatus);
              if (!employmentHasCompany(id as EmploymentStatus)) {
                setCompany('');
                setTenure('');
              }
            }}
          />

          {showCompany && (
            <MotiView
              from={{ opacity: 0, translateY: 6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
              style={{ gap: space.lg }}
            >
              <PlainField
                label={employment === 'self_employed' ? 'Business / studio' : 'Company'}
                value={company}
                onChangeText={setCompany}
                placeholder={employment === 'self_employed' ? 'Your business name' : 'Where you work'}
              />
              <PlainField
                label="How long in this role"
                value={tenure}
                onChangeText={setTenure}
                placeholder="e.g. 18 months, 2 years"
                hint="Months or years — we'll figure it out."
              />
            </MotiView>
          )}

          <PlainField
            label="Total years of experience"
            value={years}
            onChangeText={setYears}
            placeholder="e.g. 7"
            keyboardType="numeric"
            hint="Across your whole career — internships count if they were real."
          />

          <CountryField value={country} onChange={setCountry} />

          <AuthErrorBanner message={error} />

          <AuthSubmit
            label="Continue"
            loadingLabel="Saving…"
            loading={busy}
            onPress={onSubmit}
          />

          <Pressable
            onPress={async () => {
              // Mark setup as "complete" with whatever is filled in;
              // user can edit in /you later.
              await setProfile({ profileSetupComplete: true });
              router.replace('/companion-picker?next=/career' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            style={{
              alignSelf: 'center',
              paddingVertical: space.sm,
              paddingHorizontal: space.md,
            }}
          >
            <Text variant="caption" soft style={{ fontSize: 13, fontWeight: '600' }}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </Rise>
    </Screen>
  );
}

/** Best-effort "12", "6 months", "1.5 years", "2y" → months. Returns 0
 *  on unparseable input so the upsert doesn't fail; user can fix in /you. */
function parseTenureToMonths(raw: string): number {
  const t = raw.trim().toLowerCase();
  const m = /(\d+(?:\.\d+)?)/.exec(t);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (/y(ear)?/.test(t)) return Math.round(n * 12);
  return Math.round(n);
}

export default function ProfileSetup() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
