import { View } from 'react-native';

/**
 * Minimal geometric tab icons drawn with Views — no icon-font dependency, and
 * they inherit the theme's active/inactive color. Intentionally simple shapes
 * that read clearly at tab-bar size.
 */
export type TabName = 'home' | 'friends' | 'recap' | 'settings';

export function TabIcon({ name, color, size = 24 }: { name: TabName; color: string; size?: number }) {
  switch (name) {
    case 'home':
      return <Home color={color} size={size} />;
    case 'friends':
      return <Friends color={color} size={size} />;
    case 'recap':
      return <Recap color={color} size={size} />;
    case 'settings':
      return <Settings color={color} size={size} />;
  }
}

function Home({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.42,
          borderRightWidth: size * 0.42,
          borderBottomWidth: size * 0.34,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      <View style={{ width: size * 0.62, height: size * 0.4, backgroundColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: -1 }} />
    </View>
  );
}

function Friends({ color, size }: { color: string; size: number }) {
  const r = size * 0.3;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: r, height: r, borderRadius: r / 2, borderWidth: 2.4, borderColor: color }} />
        <View style={{ width: r, height: r, borderRadius: r / 2, borderWidth: 2.4, borderColor: color, marginLeft: -r * 0.35 }} />
      </View>
    </View>
  );
}

function Recap({ color, size }: { color: string; size: number }) {
  return (
    <View
      style={{
        width: size * 0.86,
        height: size * 0.86,
        borderRadius: size * 0.43,
        borderWidth: 2.4,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: 2,
          borderTopWidth: size * 0.14,
          borderBottomWidth: size * 0.14,
          borderLeftWidth: size * 0.22,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

function Settings({ color, size }: { color: string; size: number }) {
  const Row = ({ knobLeft }: { knobLeft: number }) => (
    <View style={{ width: size * 0.8, height: 2.6, backgroundColor: color, borderRadius: 2, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: `${knobLeft}%`,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: color,
        }}
      />
    </View>
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: size * 0.16 }}>
      <Row knobLeft={62} />
      <Row knobLeft={20} />
      <Row knobLeft={48} />
    </View>
  );
}
