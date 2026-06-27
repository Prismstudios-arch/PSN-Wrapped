import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ui';
import { useReduceMotion, useTheme } from '@/theme/ThemeProvider';
import { AURORA_BUTTON_GRADIENT } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  hapticStyle?: 'tap' | 'select' | 'success';
}

/**
 * Primary = the Aurora gradient (the one prominent CTA per screen).
 * Secondary = bordered surface. Ghost = text-only.
 * A subtle press-scale gives premium feel; it's skipped under reduce-motion.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  hapticStyle = 'tap',
}: ButtonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    haptics[hapticStyle]();
    onPress();
  };

  const isDisabled = disabled || loading;
  const content = (
    <ThemedText
      variant="bodyStrong"
      color={variant === 'primary' ? theme.colors.onAccent : theme.colors.text}
      center
    >
      {loading ? 'Please wait…' : label}
    </ThemedText>
  );

  const inner =
    variant === 'primary' ? (
      <LinearGradient
        colors={AURORA_BUTTON_GRADIENT as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, { borderRadius: theme.radius.pill }]}
      >
        {content}
      </LinearGradient>
    ) : (
      <View
        style={[
          styles.base,
          {
            borderRadius: theme.radius.pill,
            backgroundColor: variant === 'secondary' ? theme.colors.surfaceAlt : 'transparent',
            borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {content}
      </View>
    );

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
    >
      <Animated.View style={[{ transform: [{ scale }], opacity: isDisabled ? 0.5 : 1 }, style]}>
        {inner}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
