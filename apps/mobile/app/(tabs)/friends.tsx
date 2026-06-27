import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Row, Spacer, ThemedText } from '@/components/ui';
import { AuroraBackground } from '@/components/AuroraBackground';
import { useTheme } from '@/theme/ThemeProvider';
import { useSession } from '@/state/session';
import { usePro } from '@/state/pro';
import { ApiError, api, type FriendSearchDTO, type FriendsList, type PublicUserDTO } from '@/lib/api';
import { haptics } from '@/lib/haptics';

export default function Friends() {
  const theme = useTheme();
  const { token } = useSession();
  const { isPro } = usePro();
  const [list, setList] = useState<FriendsList>({ friends: [], incoming: [], outgoing: [] });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchDTO[]>([]);
  const [searching, setSearching] = useState(false);

  const loadList = useCallback(async () => {
    if (!token) return;
    try {
      setList(await api.friends.list(token));
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Debounced search.
  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await api.friends.search(token, query.trim());
        setResults(res.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [query, token]);

  const act = async (fn: () => Promise<unknown>) => {
    if (!token) return;
    haptics.tap();
    try {
      await fn();
      await loadList();
      if (query.trim().length >= 2) {
        const res = await api.friends.search(token, query.trim());
        setResults(res.results);
      }
    } catch {
      haptics.error();
    }
  };

  const giftPro = (u: PublicUserDTO) => {
    Alert.alert('Gift Pro?', `Give ${u.displayName ?? 'your friend'} PSN Wrapped Pro?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Gift',
        onPress: async () => {
          if (!token) return;
          try {
            await api.pro.gift(token, u.id);
            haptics.success();
            Alert.alert('Sent 🎁', `${u.displayName ?? 'Your friend'} is Pro now.`);
          } catch (err) {
            haptics.error();
            Alert.alert('Couldn’t gift', err instanceof ApiError ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.5} />
      <Screen scroll tabBarInset>
        <ThemedText variant="title">Friends</ThemedText>
        <Spacer size={6} />
        <ThemedText variant="body" color={theme.colors.textMuted}>
          Find friends by their PlayStation name. Battles need both of you to say yes.
        </ThemedText>
        <Spacer size={18} />

        {/* Search */}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a username"
          placeholderTextColor={theme.colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            fontSize: theme.fontSize(15),
          }}
        />

        {query.trim().length >= 2 ? (
          <>
            <Spacer size={12} />
            {searching ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : results.length === 0 ? (
              <ThemedText variant="caption" color={theme.colors.textFaint}>
                No one found. They need to have connected PSN Wrapped too.
              </ThemedText>
            ) : (
              <View style={{ gap: 8 }}>
                {results.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    trailing={
                      u.status === 'accepted' ? (
                        <Tag label="Friends" color={theme.colors.accentAlt} />
                      ) : u.status === 'pending_out' ? (
                        <Tag label="Requested" color={theme.colors.textFaint} />
                      ) : u.status === 'pending_in' ? (
                        <ActionBtn label="Accept" onPress={() => act(() => api.friends.accept(token!, u.id))} />
                      ) : (
                        <ActionBtn label="Add" onPress={() => act(() => api.friends.request(token!, u.id))} />
                      )
                    }
                  />
                ))}
              </View>
            )}
          </>
        ) : null}

        {/* Incoming requests */}
        {list.incoming.length > 0 ? (
          <>
            <Spacer size={24} />
            <SectionLabel text="REQUESTS" />
            <View style={{ gap: 8 }}>
              {list.incoming.map((u) => (
                <UserRow key={u.id} user={u} trailing={<ActionBtn label="Accept" onPress={() => act(() => api.friends.accept(token!, u.id))} />} />
              ))}
            </View>
          </>
        ) : null}

        {/* Friends */}
        <Spacer size={24} />
        <SectionLabel text={`FRIENDS (${list.friends.length})`} />
        {list.friends.length === 0 ? (
          <Card>
            <ThemedText variant="body" color={theme.colors.textMuted}>
              No friends yet. Search a username above to send a request.
            </ThemedText>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {list.friends.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                trailing={
                  <Row style={{ gap: 8 }}>
                    {isPro ? <ActionBtn label="🎁" onPress={() => giftPro(u)} /> : null}
                    <ActionBtn
                      label="Battle"
                      primary
                      onPress={() => {
                        haptics.select();
                        router.push({ pathname: '/battle', params: { id: u.id, name: u.displayName ?? 'Friend' } });
                      }}
                    />
                  </Row>
                }
              />
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

function UserRow({ user, trailing }: { user: PublicUserDTO; trailing: React.ReactNode }) {
  const theme = useTheme();
  const initial = (user.displayName ?? '?').trim().charAt(0).toUpperCase();
  return (
    <Card padded={false}>
      <Row style={{ padding: theme.spacing.md, gap: theme.spacing.md, justifyContent: 'space-between' }}>
        <Row style={{ gap: theme.spacing.md, flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText variant="bodyStrong">{initial}</ThemedText>
          </View>
          <ThemedText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {user.displayName ?? 'Player'}
          </ThemedText>
        </Row>
        {trailing}
      </Row>
    </Card>
  );
}

function ActionBtn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: primary ? theme.colors.accent : theme.colors.surfaceAlt,
      }}
      accessibilityRole="button"
    >
      <ThemedText variant="label" color={primary ? theme.colors.onAccent : theme.colors.text}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
      <ThemedText variant="label" color={color}>
        {label}
      </ThemedText>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <>
      <ThemedText variant="label" color={theme.colors.textFaint}>
        {text}
      </ThemedText>
      <Spacer size={10} />
    </>
  );
}
