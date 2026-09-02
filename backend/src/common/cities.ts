// Villes de Côte d'Ivoire (règle de validation côté serveur).
// Extensible aux autres pays via la table Country/City + ce fichier.
export const CITIES: [string, ...string[]] = [
  'Abidjan',
  'Bouaké',
  'Yamoussoukro',
  'Daloa',
  'San-Pédro',
  'Korhogo',
  'Gagnoa',
  'Man',
  'Abengourou',
  'Anyama',
  'Grand-Bassam',
  'Bondoukou',
  'Divo',
  'Odienné',
  'Séguéla',
];

export const CITY_NAMES = CITIES;

export function isCityValid(city: string): boolean {
  return CITY_NAMES.includes(city);
}