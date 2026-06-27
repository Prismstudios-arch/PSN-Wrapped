import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion, useTheme } from '@/theme/ThemeProvider';

/**
 * Elegant shimmer skeletons — used instead of spinners for loading states. A
 * highlight sweeps across a surface-colored block. Under reduce-motion the sweep
 * is disabled and a static muted block is shown.
 */
export function Shimmer({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const x = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1300, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [x, reduceMotion]);

  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
        style,
      ]}
    >
      {!reduceMotion && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: x.interpolate({ inputRange: [-1, 1], outputRange: [-220, 220] }) }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', theme.colors.hairline, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/** A card-shaped skeleton used while the dashboard's first load resolves. */
export function CardSkeleton({ lines = 3, height = 120 }: { lines?: number; height?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        minHeight: height,
        justifyContent: 'center',
      }}
    >
      <Shimmer width="40%" height={12} />
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} width={i === lines - 1 ? '60%' : '100%'} height={14} />
      ))}
    </View>
  );
}
