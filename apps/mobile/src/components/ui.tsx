import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import type { TypeVariant } from '@/theme/tokens';

/**
 * Themed primitives. Every screen is built from these so the Midnight Aurora
 * palette + the accessibility controls (text scaling, high contrast) apply
 * everywhere with zero per-screen wiring.
 */

// ── Text ─────────────────────────────────────────────────────────────────────
interface ThemedTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  center?: boolean;
  children: ReactNode;
}

export function ThemedText({ variant = 'body', color, center, style, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const spec = theme.type[variant];
  const resolved: TextStyle = {
    fontSize: theme.fontSize(spec.size),
    lineHeight: theme.fontSize(spec.lineHeight),
    fontWeight: spec.weight,
    letterSpacing: spec.letterSpacing,
    color: color ?? theme.colors.text,
    ...(center ? { textAlign: 'center' } : {}),
  };
  return <Text style={[resolved, style]} {...rest} />;
}

// ── Screen ───────────────────────────────────────────────────────────────────
interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: readonly Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Extra bottom padding so content clears the floating blur tab bar. */
  tabBarInset?: boolean;
}

export function Screen({
  children,
  scroll,
  edges = ['top'],
  contentStyle,
  style,
  tabBarInset,
}: ScreenProps) {
  const theme = useTheme();
  const padBottom = tabBarInset ? 110 : theme.spacing.xl;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        { padding: theme.spacing.xl, paddingBottom: padBottom },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: theme.spacing.xl, paddingBottom: padBottom }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
      {body}
    </SafeAreaView>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends ViewProps {
  children: ReactNode;
  padded?: boolean;
  tone?: 'surface' | 'surfaceAlt';
}

export function Card({ children, padded = true, tone = 'surface', style, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors[tone],
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          ...(padded ? { padding: theme.spacing.lg } : {}),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

// ── Misc layout helpers ──────────────────────────────────────────────────────
export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ height: size }} />;
}

export function Row({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]} {...rest}>
      {children}
    </View>
  );
}

export function Pill({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: (color ?? theme.colors.accent) + '22',
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 4,
      }}
    >
      <ThemedText variant="label" color={color ?? theme.colors.accent}>
        {label}
      </ThemedText>
    </View>
  );
}
