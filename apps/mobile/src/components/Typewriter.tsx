import { useEffect, useRef, useState } from 'react';
import { type TextStyle } from 'react-native';
import { ThemedText } from './ui';
import { useReduceMotion, useTheme } from '@/theme/ThemeProvider';

/**
 * Terminal-style typewriter reveal for the AI commentary card. Honors
 * reduce-motion (shows the full text immediately). `play` gates the animation so
 * it only types when its card is on screen.
 */
export function Typewriter({
  text,
  play = true,
  speedMs = 18,
  color,
  style,
}: {
  text: string;
  play?: boolean;
  speedMs?: number;
  color?: string;
  style?: TextStyle;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [count, setCount] = useState(reduceMotion ? text.length : 0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduceMotion || !play) {
      setCount(text.length);
      return;
    }
    setCount(0);
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          if (timer.current) clearInterval(timer.current);
          return c;
        }
        return c + 1;
      });
    }, speedMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, play, reduceMotion, speedMs]);

  const shown = text.slice(0, count);
  const done = count >= text.length;

  return (
    <ThemedText variant="headline" color={color ?? theme.colors.text} style={style}>
      {shown}
      {!done ? <ThemedText variant="headline" color={theme.colors.accentAlt}>▋</ThemedText> : null}
    </ThemedText>
  );
}
