import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';

/**
 * Friends — a single-row friendship model in `public.friends`:
 *   (user_id = requester, friend_user_id = recipient, status).
 * status: 'pending' (request sent) → 'accepted' (mutual consent) | 'blocked'.
 * An accepted row is the proof BOTH sides opted in, which gates Recap Battles.
 */

export interface PublicUser {
  id: string;
  displayName: string | null;
}

export type FriendStatus = 'none' | 'pending_out' | 'pending_in' | 'accepted' | 'blocked';

export interface FriendSearchResult extends PublicUser {
  status: FriendStatus;
}

async function friendshipStatus(meId: string, otherId: string): Promise<FriendStatus> {
  const { data } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_user_id, status')
    .or(`and(user_id.eq.${meId},friend_user_id.eq.${otherId}),and(user_id.eq.${otherId},friend_user_id.eq.${meId})`)
    .maybeSingle();
  if (!data) return 'none';
  if (data.status === 'accepted') return 'accepted';
  if (data.status === 'blocked') return 'blocked';
  return data.user_id === meId ? 'pending_out' : 'pending_in';
}

export async function searchUsers(meId: string, query: string): Promise<FriendSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, display_name')
    .ilike('display_name', `%${q}%`)
    .neq('id', meId)
    .limit(10);
  if (error) throw HttpError.upstream('Search failed.');

  const results: FriendSearchResult[] = [];
  for (const u of data ?? []) {
    results.push({ id: u.id, displayName: u.display_name, status: await friendshipStatus(meId, u.id) });
  }
  return results;
}

export async function sendRequest(meId: string, targetId: string): Promise<void> {
  if (meId === targetId) throw HttpError.badRequest('You can’t add yourself.');
  const status = await friendshipStatus(meId, targetId);
  if (status === 'accepted') throw HttpError.conflict('You’re already friends.');
  if (status === 'pending_out') return; // idempotent
  if (status === 'pending_in') {
    // They already requested you — accept it instead of duplicating.
    await acceptRequest(meId, targetId);
    return;
  }
  const { error } = await supabaseAdmin.from('friends').insert({ user_id: meId, friend_user_id: targetId, status: 'pending' });
  if (error) throw HttpError.upstream('Could not send request.');
}

export async function acceptRequest(meId: string, requesterId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('friends')
    .update({ status: 'accepted' })
    .eq('user_id', requesterId)
    .eq('friend_user_id', meId)
    .eq('status', 'pending')
    .select('id');
  if (error) throw HttpError.upstream('Could not accept request.');
  if (!data || data.length === 0) throw HttpError.notFound('No pending request from that user.');
}

export async function removeFriend(meId: string, otherId: string): Promise<void> {
  await supabaseAdmin
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${meId},friend_user_id.eq.${otherId}),and(user_id.eq.${otherId},friend_user_id.eq.${meId})`);
}

interface FriendRow {
  user_id: string;
  friend_user_id: string;
  status: string;
}

async function hydrate(ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabaseAdmin.from('users').select('id, display_name').in('id', ids);
  return new Map((data ?? []).map((u) => [u.id, u.display_name]));
}

export async function listFriends(meId: string): Promise<{
  friends: PublicUser[];
  incoming: PublicUser[];
  outgoing: PublicUser[];
}> {
  const { data, error } = await supabaseAdmin
    .from('friends')
    .select('user_id, friend_user_id, status')
    .or(`user_id.eq.${meId},friend_user_id.eq.${meId}`);
  if (error) throw HttpError.upstream('Could not load friends.');

  const rows = (data ?? []) as FriendRow[];
  const otherIds = rows.map((r) => (r.user_id === meId ? r.friend_user_id : r.user_id));
  const names = await hydrate(otherIds);
  const toUser = (id: string): PublicUser => ({ id, displayName: names.get(id) ?? null });

  const friends: PublicUser[] = [];
  const incoming: PublicUser[] = [];
  const outgoing: PublicUser[] = [];
  for (const r of rows) {
    const otherId = r.user_id === meId ? r.friend_user_id : r.user_id;
    if (r.status === 'accepted') friends.push(toUser(otherId));
    else if (r.status === 'pending' && r.friend_user_id === meId) incoming.push(toUser(otherId));
    else if (r.status === 'pending' && r.user_id === meId) outgoing.push(toUser(otherId));
  }
  return { friends, incoming, outgoing };
}

/** Throws unless `meId` and `otherId` are accepted friends (mutual consent). */
export async function assertFriends(meId: string, otherId: string): Promise<void> {
  if ((await friendshipStatus(meId, otherId)) !== 'accepted') {
    throw HttpError.forbidden('You can only compare with mutual friends.');
  }
}
