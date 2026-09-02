export type BadgeKey = 'flame' | 'target' | 'swords' | 'trophy' | 'headset' | 'avatar'

export const badgeSrc: Record<BadgeKey, string> = {
  flame: '/badges/flame.png',
  target: '/badges/target.png',
  swords: '/badges/swords.png',
  trophy: '/badges/trophy.png',
  headset: '/badges/headset.png',
  avatar: '/badges/avatar.png',
}

/**
 * Associe un jeu (ou un contexte) au badge 3D le plus cohérent.
 * - Free Fire → flamme, Call of Duty → cible, Valorant/épées → épées, EA FC → trophée.
 */
export function gameBadge(slug?: string | null): BadgeKey {
  const s = (slug ?? '').toLowerCase()
  if (s.includes('free') || s.includes('fire')) return 'flame'
  if (s.includes('call') || s.includes('duty') || s.includes('war')) return 'target'
  if (s.includes('valorant') || s.includes('sword') || s.includes('fortnite')) return 'swords'
  if (s.includes('ea') || s.includes('fc') || s.includes('fifa') || s.includes('foot')) return 'trophy'
  if (s.includes('headset') || s.includes('chat') || s.includes('voice')) return 'headset'
  return 'trophy'
}

export const announcement = {
  title: 'Coupe Free Fire de Korhogo',
  subtitle: 'Tournoi régional · 32 équipes max',
  deadline: 'Clôture des inscriptions le 14 sept.',
  teams: 24,
  prize: '500 000 FCFA + matériel',
  time: 'il y a 2 h',
}

export const popularCommunities = [
  { name: 'Free Fire', badge: 'flame' as BadgeKey, members: '12 480', joined: true },
  { name: 'Call of Duty', badge: 'target' as BadgeKey, members: '8 210', joined: false },
  { name: 'Valorant', badge: 'swords' as BadgeKey, members: '5 940', joined: true },
]

export const followedGames = [
  { name: 'EA Sports FC', badge: 'trophy' as BadgeKey, note: '3 events cette semaine' },
  { name: 'Free Fire', badge: 'flame' as BadgeKey, note: '2 nouveaux salons' },
]

export const games = [
  {
    name: 'Free Fire',
    badge: 'flame' as BadgeKey,
    desc: 'Battle royale mobile n°1 en CI',
    fav: true,
    stats: { talks: 340, rooms: 12, events: 5 },
  },
  {
    name: 'Call of Duty',
    badge: 'target' as BadgeKey,
    desc: 'Warzone & Mobile',
    fav: false,
    stats: { talks: 210, rooms: 8, events: 3 },
  },
  {
    name: 'Valorant',
    badge: 'swords' as BadgeKey,
    desc: 'Tactique 5v5 compétitif',
    fav: true,
    stats: { talks: 156, rooms: 6, events: 2 },
  },
  {
    name: 'EA Sports FC',
    badge: 'trophy' as BadgeKey,
    desc: 'Football — ligues & pro clubs',
    fav: false,
    stats: { talks: 289, rooms: 9, events: 4 },
  },
  {
    name: 'Fortnite',
    badge: 'swords' as BadgeKey,
    desc: 'Construction & battle royale',
    fav: false,
    stats: { talks: 98, rooms: 4, events: 1 },
  },
]

export const friendRequests = [
  { name: 'Aya K.', tag: 'Sniper · Abidjan', initials: 'AK' },
  { name: 'Yao Prince', tag: 'Support · Bouaké', initials: 'YP' },
]

export const myCommunities = [
  { name: 'Free Fire', badge: 'flame' as BadgeKey, members: '12 480' },
  { name: 'Valorant', badge: 'swords' as BadgeKey, members: '5 940' },
]

export const voiceRooms = [
  { name: 'Squad Ranked FF', game: 'Free Fire', speakers: 4, live: true },
  { name: 'Chill & Talk', game: 'Général', speakers: 7, live: true },
  { name: 'Scrims Valo', game: 'Valorant', speakers: 2, live: false },
]

export const profile = {
  pseudo: 'KZ_Warrior',
  location: 'Abidjan, CI',
  friends: 128,
  groups: 6,
  since: 'Membre depuis 2018',
  bio: 'Joueur depuis 2018. Warzone & FC.',
  favGames: ['Free Fire', 'Warzone', 'EA FC', 'Valorant'],
}
