import { hash } from "./people";
import type { World, WorldClub, WorldLeague } from "./types";

/**
 * Israel's amateur divisions: Liga Alef (3rd tier) and Liga Bet (4th tier).
 * They aren't on Transfermarkt, so they live here instead of the database:
 * real small-town clubs, made-up crests and generated squads. A career that
 * starts here has a long climb to Ligat Ha'Al.
 */
export const LOWER_LEAGUES: WorldLeague[] = [
  { key: "isr3", name: { en: "Liga Alef", he: "ליגה א'", ar: "الدرجة الثالثة" }, country: "Israel", strength: 40, tier: 3 },
  { key: "isr4", name: { en: "Liga Bet", he: "ליגה ב'", ar: "الدرجة الرابعة" }, country: "Israel", strength: 33, tier: 4 },
];

const ALEF: [string, string][] = [
  ["Hapoel Ashkelon", "הפועל אשקלון"],
  ["Hapoel Nof HaGalil", "הפועל נוף הגליל"],
  ["Hapoel Umm al-Fahm", "הפועל אום אל פחם"],
  ["Hapoel Bnei Lod", "הפועל בני לוד"],
  ["Hapoel Hadera", "הפועל חדרה"],
  ["Hapoel Kfar Kana", "הפועל כפר כנא"],
  ["Hapoel Herzliya", "הפועל הרצליה"],
  ["Hapoel Marmorek", "הפועל מרמורק"],
  ["Hapoel Karmiel", "הפועל כרמיאל"],
  ["Maccabi Yavne", "מכבי יבנה"],
  ["Hapoel Azor", "הפועל אזור"],
  ["Beitar Kfar Saba", "בית\"ר כפר סבא"],
  ["Hapoel Holon", "הפועל חולון"],
  ["Hapoel Ramat HaSharon", "הפועל רמת השרון"],
  ["Ironi Nesher", "עירוני נשר"],
  ["Hapoel Migdal HaEmek", "הפועל מגדל העמק"],
];

const BET: [string, string][] = [
  ["Maccabi Sha'arayim", "מכבי שעריים"],
  ["Hapoel Kiryat Ono", "הפועל קריית אונו"],
  ["Hapoel Tira", "הפועל טירה"],
  ["Hapoel Bnei Zalafa", "הפועל בני זלפה"],
  ["Maccabi Ironi Tamra", "מכבי עירוני טמרה"],
  ["Hapoel Gilboa", "הפועל גלבוע"],
  ["Hapoel Bik'at HaYarden", "הפועל בקעת הירדן"],
  ["Maccabi Ma'alot", "מכבי מעלות"],
  ["Hapoel Arraba", "הפועל עראבה"],
  ["Maccabi Kiryat Ata", "מכבי קריית אתא"],
  ["Hapoel Baqa al-Gharbiyye", "הפועל באקה אל גרבייה"],
  ["Hapoel Sderot", "הפועל שדרות"],
  ["Hapoel Ofakim", "הפועל אופקים"],
  ["Hapoel Dimona", "הפועל דימונה"],
  ["Maccabi Netivot", "מכבי נתיבות"],
  ["Hapoel Yeruham", "הפועל ירוחם"],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

function clubs(leagueKey: string, list: [string, string][], rating: [number, number], rep: [number, number]): WorldClub[] {
  return list.map(([en, he], i) => {
    const t = 1 - i / (list.length - 1); // first in the list = strongest
    const jitter = (hash(en) % 3) - 1;
    return {
      id: `${leagueKey}-${slug(en)}`,
      leagueKey,
      name: { en, he },
      reputation: Math.round(rep[0] + (rep[1] - rep[0]) * t),
      teamRating: Math.round(rating[0] + (rating[1] - rating[0]) * t) + jitter,
    };
  });
}

export const LOWER_CLUBS: WorldClub[] = [...clubs("isr3", ALEF, [46, 52], [5, 11]), ...clubs("isr4", BET, [39, 45], [1, 5])];

/** A club from the lower divisions (no database squad: it's generated). */
export const isLowerClub = (id: string) => id.startsWith("isr3-") || id.startsWith("isr4-");

/** The world plus the Israeli amateur divisions (only when Israel is in it). */
export function withLowerLeagues(world: World): World {
  if (!world.leagues.some((l) => l.country === "Israel") || world.leagues.some((l) => l.key === "isr3")) return world;
  return { leagues: [...world.leagues, ...LOWER_LEAGUES], clubs: [...world.clubs, ...LOWER_CLUBS] };
}
