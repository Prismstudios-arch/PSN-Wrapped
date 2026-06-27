import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion, useTheme } from '@/theme/ThemeProvider';
import { aurora } from '@/theme/tokens';

/**
 * The signature backdrop: a near-black base with soft, slowly-drifting aurora
 * blobs. The drift is disabled under reduce-motion (the blobs simply sit still),
 * so the look is preserved without the motion.
 */
export function AuroraBackground({
  children,
  intensity = 1,
  style,
}: {
  children?: ReactNode;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduceMotion]);

  const translate = (from: number, to: number) =>
    reduceMotion ? from : drift.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            backgroundColor: aurora.violet,
            opacity: 0.22 * intensity,
            top: -60,
            left: -40,
            transform: [{ translateX: translate(-10, 30) }, { translateY: translate(0, 24) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            backgroundColor: aurora.teal,
            opacity: 0.16 * intensity,
            top: 120,
            right: -70,
            transform: [{ translateX: translate(20, -20) }, { translateY: translate(10, -18) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            backgroundColor: aurora.pink,
            opacity: 0.16 * intensity,
            bottom: -40,
            left: 30,
            transform: [{ translateX: translate(-16, 18) }, { translateY: translate(8, -10) }],
          },
        ]}
      />
      {/* Vignette to keep text legible over the blobs. */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', theme.colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.1 }}
        end={{ x: 0.5, y: 1 }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 200,
  },
});
