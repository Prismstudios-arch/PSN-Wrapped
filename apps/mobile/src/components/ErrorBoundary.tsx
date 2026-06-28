import { Component, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

/**
 * Catches render/startup crashes so the app shows the actual error instead of a
 * blank/black screen. Uses hardcoded colors (no theme dependency) so it works
 * even if a provider is what crashed.
 */
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.error('PSN Wrapped crashed:', error);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0B12', paddingTop: 80, paddingHorizontal: 24 }}>
        <Text style={{ color: '#FF6B6B', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>
          Startup error
        </Text>
        <Text style={{ color: '#A6A6C2', fontSize: 13, marginBottom: 16 }}>
          Screenshot this and send it over.
        </Text>
        <ScrollView style={{ flex: 1 }}>
          <Text selectable style={{ color: '#F4F4FB', fontSize: 13, lineHeight: 18 }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </Text>
        </ScrollView>
      </View>
    );
  }
}
