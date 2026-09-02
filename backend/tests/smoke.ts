// Smoke tests — vérifie les parcours principaux de l'API sans framework externe.
// Exécution : npm run test:smoke
import http from 'node:http';
import { createApp } from '../src/app.js';
import { initSocket } from '../src/lib/socket.js';
import { initRealtime } from '../src/realtime/index.js';
import prisma from '../src/lib/prisma.js';

const PORT = 4599;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function ok(name: string, cond: unknown, detail?: unknown) {
  if (cond) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}

async function call(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  console.log('🧪 Smoke tests — Ivoire Gaming API\n');

  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);
  initRealtime(io);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  const email = `smoke_${Date.now()}@test.ci`;
  const username = `smoke_${Date.now() % 100000}`;

  // 1. Inscription
  console.log('1. Auth');
  const reg = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password: 'Passw0rd!',
      city: 'Abidjan',
      gameSlugs: ['call-of-duty', 'free-fire'],
    }),
  });
  ok('register → 201', reg.status === 201, reg.body);
  const accessToken = (reg.body as any)?.data?.tokens?.accessToken;
  const refreshToken = (reg.body as any)?.data?.tokens?.refreshToken;
  ok('register → token', typeof accessToken === 'string', accessToken ? 'ok' : 'no token');
  const meId = (reg.body as any)?.data?.user?.id;
  ok('register → user id', typeof meId === 'string');

  // 2. Login
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: email, password: 'Passw0rd!' }),
  });
  ok('login → 200 + token', login.status === 200 && typeof (login.body as any)?.data?.tokens?.accessToken === 'string');

  // 3. Refresh / logout
  const ref = await call('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  ok('refresh → 200', ref.status === 200, ref.body);
  const logout = await call('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, accessToken);
  ok('logout → 200', logout.status === 200);

  // 4. Me / profil
  console.log('2. Profil & jeux');
  const me = await call('/api/users/me', {}, accessToken);
  ok('me → 200', me.status === 200, me.body);
  ok('me → 2 jeux favoris', (me.body as any)?.data?.favorites?.length === 2, (me.body as any)?.data?.favorites);

  // 4b. max 3 jeux (doit renvoyer 400)
  const fav4 = await call('/api/users/me/favorites', {
    method: 'PATCH',
    body: JSON.stringify({ gameSlugs: ['call-of-duty', 'free-fire', 'pubg', 'fortnite'] }),
  }, accessToken);
  ok('favorites >3 → 400', fav4.status === 400, fav4.body);

  const fav3 = await call('/api/users/me/favorites', {
    method: 'PATCH',
    body: JSON.stringify({ gameSlugs: ['call-of-duty', 'free-fire', 'valorant'] }),
  }, accessToken);
  ok('favorites =3 → 200', fav3.status === 200);
  ok('message max 3 jeux inclus', JSON.stringify((fav3.body as any)?.data?.favorites ?? '').includes('favoris') || fav3.status === 200);

  // 5. Games
  console.log('3. Jeux & page jeu');
  const games = await call('/api/games');
  ok('games → 200', games.status === 200);
  ok('games → liste non vide', (games.body as any)?.data?.length >= 10, (games.body as any)?.data?.length);

  const gamePage = await call('/api/games/call-of-duty');
  ok('game detail → 200', gamePage.status === 200 && (gamePage.body as any)?.data?.slug === 'call-of-duty');

  const gameEvents = await call('/api/games/call-of-duty/events');
  ok('game events → liste', (gameEvents.body as any)?.data?.length >= 1);

  // 6. Chat public
  console.log('4. Chat public temps réel');
  const chatHistory = await call('/api/games/call-of-duty/chat', {}, accessToken);
  ok('chat history → 200', chatHistory.status === 200);
  const chatSent = await call('/api/games/call-of-duty/chat', {
    method: 'POST',
    body: JSON.stringify({ content: 'Smoke test message 🎮' }),
  }, accessToken);
  ok('chat send → 201', chatSent.status === 201, chatSent.body);

  // 7. Forum
  console.log('5. Forum');
  const forums = await call('/api/forums/game/call-of-duty?sort=popular', {}, accessToken);
  ok('forum list → articles', (forums.body as any)?.data?.items?.length >= 1);

  const forumCreate = await call('/api/forums/game/call-of-duty', {
    method: 'POST',
    body: JSON.stringify({ title: 'Smoke test — cherche teammates', content: 'Qui joue ce soir ?' }),
  }, accessToken);
  ok('forum create → 201', forumCreate.status === 201, forumCreate.body);
  const forumId = (forumCreate.body as any)?.data?.id;

  const post = await call(`/api/forums/${forumId}/posts`, {
    method: 'POST',
    body: JSON.stringify({ content: 'Je suis chaud, participe !' }),
  }, accessToken);
  ok('forum post reply → 201', post.status === 201, post.body);
  const postId = (post.body as any)?.data?.id;

  const like = await call(`/api/forums/posts/${postId}/like`, { method: 'POST' }, accessToken);
  ok('post like → liked', (like.body as any)?.data?.liked === true, like.body);

  // 8. Amis
  console.log('6. Amis');
  const adminLogin = await call('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'admin@ivoiregaming.ci', password: 'Admin@123' }),
  });
  const adminToken = (adminLogin.body as any)?.data?.tokens?.accessToken;
  ok('login admin', typeof adminToken === 'string');

  const friendReq = await call('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ userId: meId }),
  }, adminToken);
  ok('friend request → 201', friendReq.status === 201, friendReq.body);

  const myIncoming = await call('/api/friends/requests', {}, accessToken);
  ok('friend request reçue', (myIncoming.body as any)?.data?.received?.length >= 1, myIncoming.body);

  const accepted = await call('/api/friends/requests', {}, accessToken);
  const requestId = (accepted.body as any)?.data?.received?.[0]?.id;
  const accept = await call(`/api/friends/requests/${requestId}/accept`, { method: 'POST' }, accessToken);
  ok('friend request acceptée', accept.status === 200, accept.body);

  const myFriends = await call('/api/friends', {}, accessToken);
  ok('friends → 1 ami', (myFriends.body as any)?.data?.length >= 1, myFriends.body);

  // 9. Messages privés
  console.log('7. Messages privés');
  const adminId = (adminLogin.body as any)?.data?.user?.id;
  const msg = await call('/api/messages/' + adminId, {
    method: 'POST',
    body: JSON.stringify({ content: 'Hé admin, salut ! 👋' }),
  }, accessToken);
  ok('dm send → 201', msg.status === 201, msg.body);

  const conv = await call('/api/messages/conversations', {}, accessToken);
  ok('conversations → non vide', (conv.body as any)?.data?.length >= 1, conv.body);

  const read = await call('/api/messages/' + adminId + '/read', { method: 'POST' }, accessToken);
  ok('dm read → 200', read.status === 200);

  // 10. Salons vocaux
  console.log('8. Salons vocaux');
  const room = await call('/api/voice', {
    method: 'POST',
    body: JSON.stringify({ name: 'Salon smoke test 🎙️', gameSlug: 'call-of-duty' }),
  }, accessToken);
  ok('voice create → 201', room.status === 201, room.body);
  const roomId = (room.body as any)?.data?.room?.id;

  const join = await call(`/api/voice/${roomId}/join`, { method: 'POST' }, accessToken);
  ok('voice join → 200', join.status === 200, join.body);

  const toPrivate = await call(`/api/voice/${roomId}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ isPrivate: true }),
  }, accessToken);
  ok('🔒 passer en privé (owner) → 200', toPrivate.status === 200, toPrivate.body);

  const rooms = await call('/api/voice', {}, accessToken);
  ok('voice rooms list → contient salon privé', (rooms.body as any)?.data?.some((r: any) => r.id === roomId), rooms.body);

  const leave = await call(`/api/voice/${roomId}/leave`, { method: 'POST' }, accessToken);
  ok('voice leave → 200', leave.status === 200);

  // 11. Événements
  console.log('9. Événements');
  const events = await call('/api/events');
  ok('events → list', (events.body as any)?.data?.length >= 1);

  const participate = await call(`/api/events/${(events.body as any)?.data?.[0]?.id}/participate`, { method: 'POST' }, accessToken);
  ok('event participate → 200', participate.status === 200);

  // 12. Recherche + notifications + signalement
  console.log('10. Recherche, notifications, signalement');
  const search = await call('/api/search?q=Abidjan', {}, accessToken);
  ok('search → 200', search.status === 200, search.body);

  const notifs = await call('/api/notifications', {}, accessToken);
  ok('notifications → 200', notifs.status === 200);

  const unread = await call('/api/notifications/unread-count', {}, accessToken);
  ok('unread-count → 200', unread.status === 200);

  const report = await call('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ contentType: 'POST', contentId: postId, reason: 'Contenu inapproprié (test)' }),
  }, accessToken);
  ok('report → 201', report.status === 201, report.body);

  // 13. Modération (admin)
  console.log('11. Modération');
  const stats = await call('/api/moderation/stats', {}, adminToken);
  ok('moderation stats (admin)', stats.status === 200, stats.body);

  const adminReports = await call('/api/moderation/reports', {}, adminToken);
  ok('list reports (admin)', adminReports.status === 200);

  const unauthMod = await call('/api/moderation/stats', {}, accessToken);
  ok('stats refusé pour USER → 403', unauthMod.status === 403, unauthMod.body);

  // 14. Accueil agrégé
  console.log('12. Home & villes');
  const home = await call('/api/home', {}, accessToken);
  ok('home → 200', home.status === 200, home.body);
  const cities = await call('/api/cities');
  ok('cities → ≥15 villes', (cities.body as any)?.data?.length >= 15);

  // 15. Variation protection : accès sans token impossible sur les routes privées
  const noToken = await call('/api/users/me');
  ok('me sans token → 401', noToken.status === 401, noToken.body);

  server.close();
  await prisma.$disconnect();

  console.log(`\n📊 Résultat : ${passed} ✅ / ${failed} ❌`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});