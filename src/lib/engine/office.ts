import { hash } from "./people";
import { clamp, Rng } from "./rng";
import type { Bars, CareerSave } from "./types";

/**
 * End of season, in the manager's office: he tells you something about your
 * season and you react. Not every reaction goes down well — some win him over,
 * some cost you his trust. You only see what it did after you've said it.
 */
export type OfficeMood = "happy" | "neutral" | "unhappy";

export interface OfficeReaction {
  id: string;
  /** Change in the manager's trust in you. */
  trust: number;
  bars?: Partial<Omit<Bars, "trust">>;
  /** Did he like it? */
  good: boolean;
  /** You asked to leave: more clubs hear about it (more offers). */
  leave?: boolean;
  /** He gives you a 15% raise. */
  raise?: boolean;
}

export interface OfficeTopic {
  id: string;
  mood: OfficeMood;
  when?: (s: CareerSave) => boolean;
  reactions: [OfficeReaction, OfficeReaction, OfficeReaction];
}

const r = (id: string, trust: number, good: boolean, extra: Omit<OfficeReaction, "id" | "trust" | "good"> = {}): OfficeReaction => ({ id, trust, good, ...extra });

export const OFFICE_TOPICS: OfficeTopic[] = [
  // He's happy with you
  { id: "praise", mood: "happy", reactions: [r("thanks", 5, true, { bars: { form: 3 } }), r("raise", -4, false), r("startEvery", -3, false)] },
  { id: "captaincy", mood: "happy", when: (s) => s.player.age >= 22 && s.contract?.level === "first", reactions: [r("proud", 6, true, { bars: { chemistry: 6, fans: 3 } }), r("notReady", -1, false), r("onlyWithRaise", -6, false)] },
  { id: "bigClubs", mood: "happy", when: (s) => s.contract?.level === "first", reactions: [r("staying", 7, true, { bars: { fans: 3 } }), r("seeOffers", -4, false, { leave: true }), r("wantToGo", -9, false, { leave: true })] },
  { id: "newContract", mood: "happy", when: (s) => s.bars.trust >= 60, reactions: [r("signNow", 4, true, { raise: true }), r("agentTalks", 0, true), r("wantMore", -5, false)] },
  // He wants more
  { id: "wantMore", mood: "neutral", reactions: [r("workHarder", 4, true, { bars: { training: 6 } }), r("needMinutes", -1, false), r("blameSystem", -6, false)] },
  { id: "newSigning", mood: "neutral", reactions: [r("competition", 5, true, { bars: { training: 4 } }), r("leaveThen", -6, false, { leave: true }), r("noChance", -2, false, { bars: { fans: 2 } })] },
  { id: "fitness", mood: "neutral", reactions: [r("summerGym", 4, true, { bars: { fitness: 5 } }), r("imFine", -4, false), r("physioPlan", 2, true, { bars: { fitness: 3 } })] },
  { id: "position", mood: "neutral", reactions: [r("tryIt", 5, true, { bars: { training: 3 } }), r("myPosition", -4, false), r("ifIPlay", 1, true)] },
  // He's not happy
  { id: "benched", mood: "unhappy", reactions: [r("proveWrong", 4, true, { bars: { form: 3 } }), r("loanMe", -2, false, { leave: true }), r("slamDoor", -10, false, { bars: { fans: -2 } })] },
  { id: "attitude", mood: "unhappy", reactions: [r("sorry", 6, true), r("notTrue", -5, false), r("silence", -1, false)] },
  { id: "notReady", mood: "unhappy", when: (s) => s.player.age <= 20, reactions: [r("learn", 5, true, { bars: { training: 5 } }), r("readyNow", -4, false), r("youthAgain", 2, true, { bars: { form: 2 } })] },
  { id: "lastChance", mood: "unhappy", when: (s) => s.bars.trust < 45, reactions: [r("allIn", 5, true, { bars: { training: 4 } }), r("agentCall", -5, false, { leave: true }), r("shrug", -7, false)] },
];

const byId = new Map(OFFICE_TOPICS.map((t) => [t.id, t]));

/** What the manager thinks of your season. */
export function officeMood(save: CareerSave): OfficeMood {
  const ms = save.season?.matches ?? [];
  const played = ms.filter((m) => m.minutes && m.rating);
  const avg = played.length ? played.reduce((s, m) => s + m.rating!, 0) / played.length : null;
  if (avg === null || played.length < 5) return "unhappy";
  if (avg >= 6.9 || save.bars.trust >= 72) return "happy";
  if (avg < 6.3 && save.bars.trust < 60) return "unhappy";
  return "neutral";
}

/** This season's talk (the same one after a reload). */
export function officeTopic(save: CareerSave): OfficeTopic {
  const mood = officeMood(save);
  const pool = OFFICE_TOPICS.filter((t) => t.mood === mood && (!t.when || t.when(save)));
  const rng = new Rng(hash(`${save.id}:${save.season?.year}:office`));
  return rng.pick(pool);
}

/** The reaction you gave this season (if any). */
export function officeAnswer(save: CareerSave) {
  const [topicId, reactionId] = (save.talks.manager ?? "").split(":");
  const topic = byId.get(topicId);
  const reaction = topic?.reactions.find((x) => x.id === reactionId);
  return topic && reaction ? { topic, reaction } : null;
}

/** You asked to go: the agent brings an extra offer. */
export const askedToLeave = (save: CareerSave) => !!officeAnswer(save)?.reaction.leave;

export function reactInOffice(save: CareerSave, reactionId: string): CareerSave {
  if (save.talks.manager) return save;
  const topic = officeTopic(save);
  const reaction = topic.reactions.find((x) => x.id === reactionId);
  if (!reaction) return save;
  const bars = { ...save.bars, trust: Math.round(clamp(save.bars.trust + reaction.trust, 0, 100)) };
  for (const [k, v] of Object.entries(reaction.bars ?? {}) as [keyof Bars, number][]) bars[k] = Math.round(clamp((bars[k] ?? 50) + v, 0, 100));
  const contract = reaction.raise && save.contract ? { ...save.contract, wage: Math.round(save.contract.wage * 1.15), until: Math.max(save.contract.until, (save.season?.year ?? 2026) + 3) } : save.contract;
  return { ...save, bars, contract, talks: { ...save.talks, manager: `${topic.id}:${reaction.id}` } };
}
