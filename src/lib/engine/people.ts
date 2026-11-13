import { Rng } from "./rng";
import type { WorldClub } from "./types";

/** Stable number from a string (FNV-1a). */
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Fictional people: every club's head coach is made up (name + face), so the
// game never puts words in a real person's mouth.
// ---------------------------------------------------------------------------
const FIRST: Record<string, string[]> = {
  he: ["אבי", "משה", "דני", "אלי", "יוסי", "רוני", "ניר", "גיא", "עמית", "שלומי", "ברק", "אורן", "יניב", "רן", "עידו"],
  en: ["Marco", "Carlos", "Jorge", "Luca", "Pierre", "Tom", "Max", "Ibrahim", "Nikos", "Sven", "Diego", "Henrik", "Paulo", "Stefan", "Andrés"],
};
const LAST: Record<string, string[]> = {
  he: ["לוי", "כהן", "מזרחי", "פרץ", "ביטון", "אברהם", "דהן", "אזולאי", "שושן", "חדד", "גבאי", "אוחיון", "קפלן", "רוזן", "שגיא"],
  en: ["Rossi", "Silva", "Mendes", "Dupont", "Becker", "Novak", "Khalil", "Andersen", "Ferreira", "Bauer", "Haddad", "Moreno", "Kovač", "Lindqvist", "Varga"],
};

/** Israeli clubs get Israeli coaches; everyone else gets an international name. */
export function personName(seed: number, israeli: boolean) {
  const r = new Rng(seed);
  const lang = israeli ? "he" : "en";
  return `${r.pick(FIRST[lang])} ${r.pick(LAST[lang])}`;
}

export function clubManager(club: WorldClub, israeli: boolean) {
  const seed = hash(`mgr:${club.id}`);
  return { name: personName(seed, israeli), face: seed };
}

// ---------------------------------------------------------------------------
// Club colours (made-up crests use them). Known clubs by name, the rest hashed.
// ---------------------------------------------------------------------------
export type Kit = { primary: string; secondary: string; text: string };

const COLORS: [RegExp, Kit][] = [
  [/maccabi haifa/i, { primary: "#15803d", secondary: "#ffffff", text: "#ffffff" }],
  [/maccabi/i, { primary: "#facc15", secondary: "#1d4ed8", text: "#1e3a8a" }],
  [/beitar|bétar/i, { primary: "#facc15", secondary: "#111111", text: "#111111" }],
  [/hapoel|sakhnin|bnei/i, { primary: "#dc2626", secondary: "#ffffff", text: "#ffffff" }],
  [/real madrid|tottenham|fulham|swansea/i, { primary: "#f8fafc", secondary: "#1e293b", text: "#1e293b" }],
  [/barcelona/i, { primary: "#a50044", secondary: "#004d98", text: "#facc15" }],
  [/atlético|atletico/i, { primary: "#cb3524", secondary: "#ffffff", text: "#ffffff" }],
  [/liverpool|manchester united|man utd|bayern|benfica|nottingham|southampton|monaco|brentford|sevilla/i, { primary: "#c8102e", secondary: "#ffffff", text: "#ffffff" }],
  [/arsenal/i, { primary: "#ef0107", secondary: "#ffffff", text: "#ffffff" }],
  [/chelsea|everton|leicester|ipswich|schalke|porto|napoli|lazio|brighton/i, { primary: "#034694", secondary: "#ffffff", text: "#ffffff" }],
  [/manchester city|man city|coventry|racing|malmö/i, { primary: "#6cabdd", secondary: "#ffffff", text: "#0b2545" }],
  [/juventus|newcastle|udinese|botafogo|corinthians|santos/i, { primary: "#111111", secondary: "#ffffff", text: "#ffffff" }],
  [/inter|club brugge/i, { primary: "#0b4ea2", secondary: "#111111", text: "#ffffff" }],
  [/milan|flamengo|nice/i, { primary: "#c8102e", secondary: "#111111", text: "#ffffff" }],
  [/dortmund|wolves|wolverhampton|watford|villarreal|fenerbah|boca|al nassr|al-nassr|ittihad|ajax/i, { primary: "#fde047", secondary: "#111111", text: "#111111" }],
  [/paris|psg/i, { primary: "#004170", secondary: "#da291c", text: "#ffffff" }],
  [/celtic|sporting|werder|wolfsburg|panathinaikos|palmeiras|saint-étienne|al ahli/i, { primary: "#15803d", secondary: "#ffffff", text: "#ffffff" }],
  [/rangers|al hilal|olympique de marseille|marseille/i, { primary: "#1d4ed8", secondary: "#ffffff", text: "#ffffff" }],
  [/aston villa|west ham|burnley|torino|roma/i, { primary: "#7a263a", secondary: "#95bfe5", text: "#ffffff" }],
  [/galatasaray/i, { primary: "#a90432", secondary: "#fdb912", text: "#fdb912" }],
  [/feyenoord|psv|olympiacos|olympiakos/i, { primary: "#dc2626", secondary: "#ffffff", text: "#ffffff" }],
  [/river plate/i, { primary: "#ffffff", secondary: "#dc2626", text: "#dc2626" }],
];

const FALLBACK: Kit[] = [
  { primary: "#dc2626", secondary: "#ffffff", text: "#ffffff" },
  { primary: "#1d4ed8", secondary: "#ffffff", text: "#ffffff" },
  { primary: "#15803d", secondary: "#ffffff", text: "#ffffff" },
  { primary: "#facc15", secondary: "#111111", text: "#111111" },
  { primary: "#111111", secondary: "#ffffff", text: "#ffffff" },
  { primary: "#7c3aed", secondary: "#ffffff", text: "#ffffff" },
  { primary: "#ea580c", secondary: "#111111", text: "#ffffff" },
  { primary: "#0ea5e9", secondary: "#0b2545", text: "#0b2545" },
  { primary: "#7a263a", secondary: "#95bfe5", text: "#ffffff" },
  { primary: "#f8fafc", secondary: "#dc2626", text: "#dc2626" },
];

export function clubKit(club: Pick<WorldClub, "id" | "name">): Kit {
  const name = club.name.en;
  for (const [re, kit] of COLORS) if (re.test(name)) return kit;
  return FALLBACK[hash(club.id) % FALLBACK.length];
}

/** Away kit when both teams would wear similar colours. */
export function awayKit(home: Kit, away: Kit): Kit {
  const close = (a: string, b: string) => {
    const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [n(a), n(b)];
    return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 160;
  };
  return close(home.primary, away.primary) ? { primary: away.secondary, secondary: away.primary, text: away.primary === "#ffffff" ? "#111111" : away.primary } : away;
}
