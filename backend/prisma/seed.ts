// Seed — Ivoire Gaming. Données de démonstration.
// Exécution : npm run seed
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const CI = 'Côte d\'Ivoire';
const CITIES = [
  'Abidjan', 'Bouaké', 'Yamoussoukro', 'Daloa', 'San-Pédro', 'Korhogo',
  'Gagnoa', 'Man', 'Abengourou', 'Anyama', 'Grand-Bassam', 'Bondoukou',
  'Divo', 'Odienné', 'Séguéla',
];

const GAMES = [
  { name: 'EA Sports FC', slug: 'ea-sports-fc', icon: '⚽', description: 'Football — Ultimate Team, Clubs et Pro Clubs en ligne.' },
  { name: 'Call of Duty', slug: 'call-of-duty', icon: '🎯', description: 'FPS — Warzone, Multiplayer et Ranked.' },
  { name: 'PUBG', slug: 'pubg', icon: '🪂', description: 'Battle royale — squad en top 1.' },
  { name: 'Free Fire', slug: 'free-fire', icon: '🔥', description: 'Battle royale mobile — le plus joué en Côte d\'Ivoire.' },
  { name: 'Fortnite', slug: 'fortnite', icon: '🛡️', description: 'Battle royale créatif.' },
  { name: 'Valorant', slug: 'valorant', icon: '⚔️', description: 'Tactical FPS par équipes de 5.' },
  { name: 'League of Legends', slug: 'league-of-legends', icon: '🧙', description: 'MOBA — summoner\'s rift.' },
  { name: 'Mobile Legends', slug: 'mobile-legends', icon: '📱', description: 'MOBA mobile — ranked 5v5.' },
  { name: 'eFootball', slug: 'efootball', icon: '🍃', description: 'Football — match en ligne et my club.' },
  { name: 'Tekken', slug: 'tekken', icon: '🥋', description: 'Jeu de combat — King of Iron Fist.' },
  { name: 'Street Fighter', slug: 'street-fighter', icon: '🥊', description: 'FG classique — combos et footsies.' },
  { name: 'Mortal Kombat', slug: 'mortal-kombat', icon: '🩸', description: 'FG brutal — fatalités.' },
  { name: 'FIFA', slug: 'fifa', icon: '⚽', description: 'Football — ligues et FUT.' },
  { name: 'Rocket League', slug: 'rocket-league', icon: '🚙', description: 'Foot-voitures aérien.' },
  { name: 'Apex Legends', slug: 'apex-legends', icon: '🦅', description: 'Battle royale héroïque.' },
] as const;

const PASSWORD = {
  admin: 'Admin@123',
  modo: 'Modo@123',
  user: 'Passw0rd!',
};

async function main() {
  console.log('🧹 Nettoyage…');
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.voiceRoomInvite.deleteMany();
  await prisma.voiceRoomMember.deleteMany();
  await prisma.voiceRoom.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.forumLike.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.forum.deleteMany();
  await prisma.gameChatMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.groupMessage.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.userGame.deleteMany();
  await prisma.gameCommunityMember.deleteMany();
  await prisma.gameCommunity.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userPrivacy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.game.deleteMany();
  await prisma.city.deleteMany();
  await prisma.country.deleteMany();

  // ── Pays & villes ────────────────────────────────────────────────
  const country = await prisma.country.create({
    data: { code: 'CI', name: CI, flag: '🇨🇮' },
  });
  await prisma.city.createMany({
    data: CITIES.map((name) => ({ name, countryId: country.id })),
  });
  console.log(`🗺️  ${CI} + ${CITIES.length} villes`);

  // ── Jeux ────────────────────────────────────────────────────────
  const gamesById = new Map<string, { id: string; slug: string; icon: string | null }>();
  for (const g of GAMES) {
    const created = await prisma.game.create({
      data: { name: g.name, slug: g.slug, icon: g.icon, description: g.description },
    });
    gamesById.set(g.slug, created);
  }
  console.log(`🎮 ${GAMES.length} jeux`);

  // ── Utilisateurs ─────────────────────────────────────────────────
  const hash = (pw: string) => argon2.hash(pw);
  const [adminHash, modoHash, userHash] = await Promise.all([
    hash(PASSWORD.admin),
    hash(PASSWORD.modo),
    hash(PASSWORD.user),
  ]);
  const mkUser = (username: string, email: string, passwordHash: string, data: Record<string, unknown> = {}) =>
    prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatar: `https://api.dicebear.com/9.x/identicon/svg?seed=${username}&backgroundColor=0f0f23,1b1b33,2a2a4a`,
        bio: data.bio as string ?? 'Gamer ivoirien 🎮',
        city: (data.city as string) ?? 'Abidjan',
        role: (data.role as string) ?? 'USER',
        status: 'OFFLINE',
        lastSeen: new Date(),
        birthDate: new Date(1998, 5, 14),
      },
    });

  const users: Record<string, { id: string; role: string }> = {};
  const raw = [
    { key: 'admin', username: 'AdminCI', email: 'admin@ivoiregaming.ci', passwordHash: adminHash, data: { role: 'ADMIN', city: 'Abidjan', bio: 'Admin de la plateforme 🛡️' } },
    { key: 'modo', username: 'ModoCI', email: 'modo@ivoiregaming.ci', passwordHash: modoHash, data: { role: 'MODERATOR', city: 'Bouaké', bio: 'Modérateur de la communauté.' } },
    { key: 'kader', username: 'Kader', email: 'kader@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Abidjan', bio: 'Joueur depuis 2018. Warzone & FC.' } },
    { key: 'yann', username: 'Yann', email: 'yann@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Abidjan', bio: 'Free Fire addict 🔥' } },
    { key: 'abdou', username: 'Abdou', email: 'abdou@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Korhogo', bio: 'Captain de la team Sahélien Wolves.' } },
    { key: 'fatou', username: 'Fatou', email: 'fatou@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Abidjan', bio: 'Valorant Radiant en devenir ✨' } },
    { key: 'driss', username: 'Driss', email: 'driss@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Daloa', bio: 'Tekken 8 champion local 🥋' } },
    { key: 'asek', username: 'Asek', email: 'asek@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Yamoussoukro', bio: 'Mobile Legends main Franco.' } },
    { key: 'sita', username: 'Sita', email: 'sita@ivoiregaming.ci', passwordHash: userHash, data: { city: 'Grand-Bassam', bio: 'Streamer esport 🇨🇮' } },
  ] as const;

  for (const u of raw) {
    const created = await mkUser(u.username, u.email, u.passwordHash, u.data);
    users[u.key] = { id: created.id, role: created.role };
    // privacy par défaut
    await prisma.userPrivacy.create({ data: { userId: created.id } });
  }
  console.log(`👤 ${raw.length} utilisateurs`);

  // ── Jeux favoris ─────────────────────────────────────────────────
  const favs: Record<string, string[]> = {
    admin: ['call-of-duty', 'ea-sports-fc'],
    modo: ['free-fire', 'pubg'],
    kader: ['call-of-duty', 'ea-sports-fc', 'free-fire'],
    yann: ['free-fire', 'pubg', 'fortnite'],
    abdou: ['apex-legends', 'pubg', 'free-fire'],
    fatou: ['valorant', 'league-of-legends'],
    driss: ['tekken', 'street-fighter', 'mortal-kombat'],
    asek: ['mobile-legends', 'league-of-legends'],
    sita: ['ea-sports-fc', 'call-of-duty', 'valorant'],
  };
  for (const [key, slugs] of Object.entries(favs)) {
    await prisma.userGame.createMany({
      data: slugs.map((slug, i) => ({
        userId: users[key].id,
        gameId: gamesById.get(slug)!.id,
        position: i,
      })),
    });
  }

  // ── Communautés (adhésion synchro avec les favoris) ──────────────────
  console.log(`🎮 sync communautés pour ${gamesById.size} jeux`);
  for (const slug of gamesById.keys()) {
    await prisma.gameCommunity.upsert({
      where: { gameId: gamesById.get(slug)!.id },
      update: {},
      create: { gameId: gamesById.get(slug)!.id },
    });
  }
  for (const [key, slugs] of Object.entries(favs)) {
    for (const slug of slugs) {
      const gameId = gamesById.get(slug)!.id;
      const community = await prisma.gameCommunity.findUnique({ where: { gameId } });
      if (community) {
        await prisma.gameCommunityMember.upsert({
          where: { communityId_userId: { communityId: community.id, userId: users[key].id } },
          update: {},
          create: { communityId: community.id, userId: users[key].id },
        });
      }
    }
  }

  // ── Amitiés ──────────────────────────────────────────────────────
  const friendships: Array<[string, string]> = [
    ['kader', 'yann'], ['kader', 'abdou'], ['yann', 'abdou'],
    ['kader', 'fatou'], ['fatou', 'sita'], ['sita', 'kader'],
    ['driss', 'asek'], ['abdou', 'driss'], ['yann', 'driss'],
  ];
  for (const [a, b] of friendships) {
    await prisma.friendship.createMany({
      data: [
        { userId: users[a].id, friendId: users[b].id },
        { userId: users[b].id, friendId: users[a].id },
      ],
    });
  }
  // une demande en attente pour la démo
  await prisma.friendRequest.create({
    data: { senderId: users['asek'].id, receiverId: users['kader'].id, status: 'PENDING' },
  });
  console.log(`🤝 ${friendships.length * 2} amitiés bilatérales`);

  // ── Événements ───────────────────────────────────────────────────
  const now = Date.now();
  const mkEvent = async (slug: string, title: string, location: string, orgKey: string, inDays: number) => {
    const e = await prisma.event.create({
      data: {
        gameId: gamesById.get(slug)!.id,
        organizerId: users[orgKey].id,
        title,
        description: `Événement communautaire ${title} organisé par la communauté Ivoire Gaming.`,
        location,
        startDate: new Date(now + inDays * 86400000),
        status: 'UPCOMING',
      },
    });
    return e;
  };
  const ev1 = await mkEvent('call-of-duty', 'Tournoi Call of Duty — Abidjan', 'Abidjan', 'sita', 12);
  await mkEvent('ea-sports-fc', 'Tournoi EA Sports FC — Cocody', 'Abidjan', 'sita', 20);
  await mkEvent('free-fire', 'Free Fire Community Cup', 'Bouaké', 'modo', 25);
  await mkEvent('free-fire', 'Free Fire — Coupe de Korhogo', 'Korhogo', 'abdou', 8);
  await mkEvent('valorant', 'Valorant Abidjan Showdown', 'Abidjan', 'admin', 15);
  await mkEvent('tekken', 'Tekken 8 Korhogo Battle', 'Korhogo', 'driss', 5);
  // participants sur le premier événement
  await prisma.eventParticipant.createMany({
    data: [
      { eventId: ev1.id, userId: users['kader'].id },
      { eventId: ev1.id, userId: users['yann'].id },
      { eventId: ev1.id, userId: users['abdou'].id },
    ],
  });
  console.log(`📅 6 événements`);

  // ── Forums & posts ───────────────────────────────────────────────
  const mkForum = async (slug: string, author: string, title: string, content: string, daysAgo = 1) => {
    const f = await prisma.forum.create({
      data: {
        gameId: gamesById.get(slug)!.id,
        authorId: users[author].id,
        title,
        content,
        createdAt: new Date(now - daysAgo * 86400000),
      },
    });
    const p1 = await prisma.forumPost.create({
      data: { forumId: f.id, authorId: users[author].id, content, createdAt: new Date(now - daysAgo * 86400000) },
    });
    await prisma.forumPost.create({
      data: { forumId: f.id, authorId: users['modo'].id, content: 'Bonne initiative 💪 On se rejoint ce soir.', createdAt: new Date(now - (daysAgo - 0.01) * 86400000) },
    });
    await prisma.forumLike.createMany({
      data: [
        { forumPostId: p1.id, userId: users['yann'].id },
        { forumPostId: p1.id, userId: users['abdou'].id },
        { forumPostId: p1.id, userId: users['kader'].id },
      ],
    });
    return f;
  };
  await mkForum('call-of-duty', 'kader', 'Qui joue en ranked ce soir ?', 'On cherche 2 autres pour le ranked squad, départs à 21h. 🎯');
  await mkForum('call-of-duty', 'abdou', 'Quel est votre meilleur loadout ?', 'Moi je joue XM4 + pieds légers. Et vous ?');
  await mkForum('call-of-duty', 'sita', 'Tournoi ce week-end à Abidjan', 'On monte une équipe pour le tournoi COD du samedi ? Détails ici 👇');
  await mkForum('free-fire', 'yann', 'Recherche joueurs pour team', 'Team semi-sérieuse, objectif : le top 100 de Côte d\'Ivoire. 🔥');
  await mkForum('free-fire', 'modo', 'Quelqu\'un veut faire une partie ?', 'Ce soir boost party tout niveau.');
  await mkForum('valorant', 'fatou', 'Valorant : bronze à or, mon parcours', '1 saison pour passer bronze → or solo queue. AMA 😄');
  await mkForum('ea-sports-fc', 'sita', 'Meilleure formation FC 26 ?', '442 flat vs 41212 narrow, vos avis.');
  await mkForum('tekken', 'driss', 'Kazuya ou Jin en 2026 ?', 'Je cherche le perso pour commencer la compétition locale.');
  await mkForum('mobile-legends', 'asek', 'Duo ranked mobile legends', 'Grand Maître à la recherche d\'un duo fiable.');
  console.log(`📝 9 discussions + likes`);

  // ── Salons vocaux ────────────────────────────────────────────────
  const mkRoom = async (slug: string | null, owner: string, name: string, members: string[], daysAgo = 0) => {
    const room = await prisma.voiceRoom.create({
      data: {
        gameId: slug ? gamesById.get(slug)!.id : null,
        ownerId: users[owner].id,
        name,
        createdAt: new Date(now - daysAgo * 86400000),
      },
    });
    await prisma.voiceRoomMember.createMany({
      data: members.map((m) => ({ roomId: room.id, userId: users[m].id })),
    });
    // les présents sont "en ligne" pour la démo
    await prisma.user.updateMany({
      where: { id: { in: members.map((m) => users[m].id) } },
      data: { status: 'ONLINE', lastSeen: new Date() },
    });
    return room;
  };
  await mkRoom('call-of-duty', 'kader', 'Ranked COD ce soir 🎯', ['kader', 'yann', 'abdou', 'sita'], 0);
  await mkRoom('free-fire', 'yann', 'Free Fire Côte d\'Ivoire 🔥', ['yann', 'asek', 'modo', 'abdou'], 0);
  await mkRoom('mobile-legends', 'asek', 'ML rank Abidjan 📱', ['asek', 'driss'], 1);
  await mkRoom(null, 'sita', 'Hangout Ivoire Gaming 🎙️', ['sita', 'kader', 'fatou'], 0);
  console.log(`🎙️ 4 salons vocaux`);

  // ── Chat public (historique) ──────────────────────────────────────
  const chatRows = [
    { slug: 'call-of-duty', author: 'kader', content: 'On lance un squad boost ce soir, 4 slots 👀' },
    { slug: 'call-of-duty', author: 'yann', content: 'Je suis chaud, j\'amène le 5e !' },
    { slug: 'call-of-duty', author: 'abdou', content: 'Warzone ou ranked ?' },
    { slug: 'free-fire', author: 'modo', content: 'Rappel : la coupe de Korhogo c\'est la semaine prochaine 🔥' },
    { slug: 'free-fire', author: 'abdou', content: 'On forme une équipe de 4 pour la coupe ?' },
    { slug: 'valorant', author: 'fatou', content: 'Un 5 stack radiant ici ? 🙋' },
  ];
  for (const c of chatRows) {
    await prisma.gameChatMessage.create({
      data: {
        gameId: gamesById.get(c.slug)!.id,
        senderId: users[c.author].id,
        content: c.content,
        createdAt: new Date(now - Math.floor(Math.random() * 3600) * 1000),
      },
    });
  }

  // ── Groupes ───────────────────────────────────────────────────────
  const group = await prisma.group.create({
    data: {
      name: 'Team Abidjan 🐺',
      description: 'Groupe d\'amis gaming — COD & Free Fire.',
      ownerId: users['kader'].id,
    },
  });
  await prisma.groupMember.createMany({
    data: [
      { groupId: group.id, userId: users['kader'].id, role: 'OWNER' },
      { groupId: group.id, userId: users['yann'].id, role: 'ADMIN' },
      { groupId: group.id, userId: users['abdou'].id },
      { groupId: group.id, userId: users['sita'].id },
    ],
  });
  await prisma.groupMessage.createMany({
    data: [
      { groupId: group.id, senderId: users['kader'].id, content: 'Bienvenue dans la team ! 🐺' },
      { groupId: group.id, senderId: users['yann'].id, content: 'On grind ce week-end ?' },
    ],
  });

  // ── Annonces ──────────────────────────────────────────────────────
  await prisma.announcement.create({
    data: {
      title: '🚀 Lancement d\'Ivoire Gaming',
      content: 'Bienvenue à toutes et tous ! L\'appli est en bêta. Invitez vos amis et créez vos premiers salons vocaux.',
      createdById: users['admin'].id,
    },
  });
  await prisma.announcement.create({
    data: {
      title: '🏆 Coupe Free Fire de Korhogo',
      content: 'Inscriptions ouvertes jusqu\'au 5 septembre. 20 équipes, lots à gagner !',
      createdById: users['admin'].id,
    },
  });

  // ── Notifications de démo ─────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: users['kader'].id, type: 'FRIEND_REQUEST', content: 'Asek t\'a envoyé une demande d\'ami.', refType: 'user', refId: users['asek'].id },
      { userId: users['kader'].id, type: 'EVENT_REMINDER', content: 'Tekken 8 Korhogo Battle commence dans 5 jours.', refType: 'event' },
      { userId: users['yann'].id, type: 'FORUM_REPLY', content: 'ModoCI a répondu à « Qui joue en ranked ce soir ? ».', refType: 'forum' },
    ],
  });

  console.log('\n✅ Seed terminé.');
  console.log('   admin@ivoiregaming.ci / Admin@123');
  console.log('   modo@ivoiregaming.ci / Modo@123');
  console.log('   kader@ivoiregaming.ci / Passw0rd!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());