# כוכב כדורגל · Football Star — Project Plan

> **Name:** "כוכב כדורגל" (Hebrew, main title) · "Football Star" (English) · "نجم كرة القدم" (Arabic). The title follows the selected language.
> **Domain:** none yet — live at https://football-star-one.vercel.app until one is bought.

> **Logo:** provided by the owner (`assets/logo-source.png`) — navy + silver badge with Star of David. Site palette follows it (dark navy default theme).

> A football (soccer) game website: **Trivia**, **Player Career**, and **Manager Career**.
> Languages: **Hebrew (default, RTL)**, **English (LTR)**, **Arabic (RTL, shortly after launch)**.
> Stack: **Next.js (App Router) + Tailwind CSS + Supabase**, hosted on **Vercel**. Everything stays on free tiers.
> Audience: **everyone**, with an **Israeli focus**. **Non-commercial** (no ads, no payments).

---

## 1. Guiding Principles

1. **Free tier first.** Every design decision fits Vercel Hobby + Supabase Free (see §8). Non-commercial use is compatible with Vercel Hobby.
2. **Israeli first.** Hebrew is the default language, Israeli football is a first-class topic everywhere (trivia categories, default league, Israeli players abroad, national team).
3. **10–15 minute sessions.** Every mode is designed so a satisfying session takes 10–15 minutes, ending on a hook that makes you want "one more" (next season, next round, tomorrow's daily challenge).
4. **Mobile first.** Every screen must work at 360px wide.
5. **RTL by default.** Logical CSS (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end`) from day one so Hebrew/Arabic and English share one layout.
6. **Simulation runs in the browser.** Match/season simulation is pure TypeScript on the client; only results/saves are written to Supabase.
7. **Play first, sign up later.** Guests can play immediately; progress is kept in `localStorage` and migrated on sign-up.
8. **Safe for all ages.** Minimal personal data (no age, phone or address), no free-text chat between users, usernames filtered.

---

## 2. Tech Decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Server Components, routing, Vercel-native |
| Styling | Tailwind CSS (logical properties) + `shadcn/ui` | Fast UI, RTL-friendly |
| i18n | Built-in: `/[locale]` root segment + `next/root-params` + JSON dictionaries | Zero dependencies, fully compatible with Next 16 Cache Components (changed from `next-intl` in Phase 0) |
| Fonts | `Heebo` (he/en) + `Cairo` (ar) via `next/font` | Good Hebrew/Arabic support, self-hosted |
| Auth | Supabase Auth (email magic link + Google) | Free, 50k MAU |
| Database | Supabase Postgres + Row Level Security | Free 500 MB |
| Game state | Zustand (client) + JSONB saves in Supabase | Simple, cheap |
| Simulation | Pure TS module `lib/engine/*` with seeded RNG | Testable, deterministic, runs offline |
| Images | Generated SVG crests/kits/avatars | No copyrighted logos/photos |
| Analytics | Vercel Web Analytics (free tier) | Zero setup |
| Testing | Vitest (engine) + Playwright (smoke tests) | Engine correctness matters most |

---

## 3. Page Structure

All routes are prefixed with locale: `/he` (default), `/en`, `/ar`. `<html lang dir>` is set per locale.

```
/[locale]
├── /                          Home — hero, 2 mode cards (Player / Manager career), daily challenge
├── /auth/login, /auth/callback
├── /profile                   Avatar, name, language, stats, achievements, favourite club
├── /leaderboard               Global / weekly / daily tabs (per mode)
│
├── /daily                     Daily Challenge: today's club + objective (sign-in to compete), leaderboard
│
├── /player-career
│   ├── /                      My saves / "New career"
│   ├── /new                   1. Create player  2. Pick LEAGUE  3. Pick from 2–3 CLUB offers (youth team)
│   │                          4. Pick TRIVIA TOPICS for career questions
│   └── /[saveId]
│       ├── /                  Dashboard: status bars (trust, form, training, fitness, morale, fans), "Play half season"
│       ├── /highlights        2D animated highlights of the half-season (Skip button)
│       ├── /season-end        Season review → talk with manager → talk with agent (offers / renewal)
│       ├── /match/[matchId]   Text match + key decision moments
│       ├── /question          Career trivia question (pop-up between matches / seasons) → training points
│       ├── /training          Weekly training focus (spend training points here)
│       ├── /retire            Retirement: career summary → "Continue as a manager" or finish
│       ├── /stats             Season & career stats
│       ├── /club              Club, contract, team status, promotion progress
│       ├── /offers            Transfer offers (incl. clubs abroad)
│       └── /inbox             Coach / agent / scout messages, story choices
│
├── /manager-career
│   ├── /                      My saves / "New career"
│   ├── /new                   Pick league (any of the 20) → pick club → manager profile → pick trivia topics
│   ├── /new?from=[playerSaveId]  Continue after retiring as a player: pick from job offers
│   └── /[saveId]
│       ├── /                  Dashboard: next fixture, board confidence, budget
│       ├── /question          Career trivia question → small boost (see §6.4)
│       ├── /squad             Squad, player details (league + world ratings), morale
│       ├── /tactics           Formation, lineup, mentality
│       ├── /match/[matchId]   Text match + substitutions
│       ├── /fixtures, /table
│       ├── /transfers         Market across all 20 leagues
│       └── /inbox             Board, media, player messages
│
├── /about, /privacy, /terms
└── /admin                     (role-protected)
    ├── /questions             CRUD, bulk import, fact-check queue, translation status
    ├── /players               Search, edit/lock ratings, Hebrew/Arabic names
    ├── /clubs, /leagues
    └── /reports               Reported questions
```

---

## 4. Database Schema (Supabase Postgres)

### Conventions
- Translatable text is **JSONB**: `{"he": "...", "en": "...", "ar": "..."}`. UI falls back `requested → en`. (For player/club names, missing `he`/`ar` simply shows English — by design, see §5.3.)
- All tables: `id uuid PK default gen_random_uuid()`, `created_at timestamptz default now()` unless noted.
- **RLS on every table.** Users touch only their own rows; base data is public read-only; admins write via `is_admin()`.

### 4.1 Users

```sql
profiles (
  id uuid PK references auth.users,
  username text unique,           -- filtered for profanity
  display_name text, avatar_url text,
  preferred_locale text check (preferred_locale in ('he','en','ar')) default 'he',
  favourite_club_id uuid FK clubs null,
  role text default 'user' check (role in ('user','admin','editor')),
  xp int default 0, level int default 1,
  daily_streak int default 0, last_daily_date date,
  created_at, updated_at
)

achievements (id text PK, name jsonb, description jsonb, icon text, xp_reward int)
user_achievements (user_id, achievement_id, unlocked_at, PK(user_id, achievement_id))
```

### 4.2 Trivia

```sql
trivia_topics (                     -- what the user picks at the start
  id uuid PK, slug text unique,
  name jsonb, icon text,
  group_slug text,                  -- 'israel' | 'europe' | 'international' | 'general'
  sort_order int, is_active bool
)

trivia_questions (
  id uuid PK,
  type text check (type in ('multiple_choice','true_false','guess_player','career_path','order')),
  difficulty smallint check (difficulty between 3 and 5),  -- 3 Medium, 4 Hard, 5 Expert (no easy questions)
  question jsonb,                   -- {"he","en","ar"} — same question, translated
  options jsonb,                    -- [{"id":"a","text":{"he","en","ar"}}, ...] — same answers, translated
  correct_option text,              -- never sent to the client before answering
  explanation jsonb,
  source text,                      -- 'generated' | 'template' | 'opentdb' | 'manual'
  source_ref text,                  -- URL / reference used to fact-check
  verified bool default false,      -- passed the automated fast fact-check (§6.3)
  status text default 'draft' check (status in ('draft','review','published','retired')),
  times_answered int default 0, times_correct int default 0,  -- auto-calibrates real difficulty
  created_by uuid FK profiles null
)

trivia_question_topics (            -- a question can belong to several topics
  question_id uuid FK, topic_id uuid FK, PRIMARY KEY (question_id, topic_id)
)

trivia_sessions (
  id uuid PK, user_id uuid FK profiles null,
  mode text check (mode in ('round','daily','survival','duel')),
  topic_ids uuid[], difficulty smallint, locale text,
  question_ids uuid[],
  score int, correct_count int, total_time_ms int,
  started_at, finished_at
)

trivia_answers (
  session_id uuid FK, question_id uuid FK,
  chosen_option text, is_correct bool, time_ms int,
  PRIMARY KEY (session_id, question_id)
)

user_seen_questions (               -- anti-repetition: don't re-serve recently seen questions
  user_id uuid, question_id uuid, last_seen_at timestamptz,
  PRIMARY KEY (user_id, question_id)
)

daily_challenges (date date PK, question_ids uuid[])
question_reports (id, question_id, user_id, reason, note, resolved bool)
```

Answers are checked by RPC `submit_trivia_answer(session_id, question_id, option)` (`security definer`). Question picking (`start_trivia_round(topics, difficulty)`) prefers questions the user hasn't seen, then least-recently-seen.

### 4.3 Football World (real data, read-only)

```sql
countries (code text PK, name jsonb, flag_emoji text)

leagues (
  id uuid PK, external_id text, country_code text FK,
  name jsonb, tier smallint, num_teams smallint,
  strength smallint,                -- 1..100, used for "world" rating & offer logic
  is_playable bool
)

clubs (
  id uuid PK, external_id text, league_id uuid FK,
  name jsonb, short_name jsonb,
  primary_color text, secondary_color text,   -- for generated crests/kits
  reputation smallint,              -- 1..100 (world scale)
  budget bigint, stadium_name jsonb, stadium_capacity int
)

players (
  id uuid PK, external_id text, club_id uuid FK null,
  name jsonb,                       -- {"en":"Kylian Mbappé","he":"קיליאן אמבפה"}; he/ar only for Israeli league + stars
  nationality text FK countries,
  birth_date date, position text,   -- GK, CB, LB, RB, DM, CM, AM, LW, RW, ST
  shirt_number smallint,
  rating_world smallint,            -- 1..99, compared to ALL players worldwide
  attributes jsonb,                 -- {"pace","shooting","passing","dribbling","defending","physical","goalkeeping"}
  potential smallint,
  value bigint, wage int,
  rating_source text,               -- 'researched' (top players) | 'formula'
  ratings_locked bool default false -- sync won't overwrite hand-tuned ratings
)

-- league rating is DERIVED, not stored: percentile of rating_world within the player's league, scaled to 1..99
create view player_ratings as
  select p.*, round(1 + 98 * percent_rank() over (partition by c.league_id order by p.rating_world)) as rating_league
  from players p join clubs c on c.id = p.club_id;

data_snapshots (id, season text, source text, imported_at, is_current bool)
```

### 4.4 Career Saves (both modes)

Each save stores its whole evolving world as **one JSONB snapshot**; only small summaries are columns.

```sql
career_saves (
  id uuid PK, user_id uuid FK profiles,
  mode text check (mode in ('player','manager')),
  name text, version int, seed bigint,
  league_id uuid FK, club_id uuid FK,
  current_season smallint, current_week smallint,
  trivia_topic_ids uuid[],          -- topics chosen at career start for in-career questions
  parent_save_id uuid FK career_saves null,  -- manager save that continues a retired player's save
  status text default 'active' check (status in ('active','retired','injury_retired','finished')),
  -- 'retired'        = player retired (button or age 43); may continue as manager
  -- 'injury_retired' = career-ending injury; may continue as manager
  -- 'finished'       = career over (manager sacked with no offers, or player chose "End career")
  summary jsonb,                    -- {rating_world, rating_league, goals, trophies, team_level: 'youth'|'first'} ...
  state jsonb,                      -- full world snapshot (hidden potential & trivia boost counters live HERE)
  updated_at
)
-- Max 3 active saves per user per mode (trigger)
-- When a player retires and continues as manager: a new 'manager' save is created with
-- parent_save_id = the player save, and it inherits the same world (same season, same squads,
-- same history). The player save becomes status = 'retired' and read-only.

career_history (                    -- one row per finished season
  id, save_id FK, user_id, mode, season, club_id, stats jsonb, trophies text[]
)
```

> **Hidden potential & cheating:** since the save is loaded into the browser, a technical user could find their hidden potential in dev tools. For a free non-competitive game this is acceptable; potential is stored obfuscated (not plain-text "potential: 91") so casual players never see it.

### 4.5 Leaderboards (views, refreshed daily)
`trivia_weekly`, `trivia_alltime`, `trivia_daily`, `player_career_best`, `manager_career_best`.

### 4.6 Scheduled jobs (Vercel Cron, Hobby = once per day)
Daily at 00:00 Israel time: generate daily challenge, refresh leaderboards, reset broken streaks, keep Supabase awake.

---

## 5. Real-World Data

### 5.1 Leagues — 20 playable top divisions (to confirm)

| # | League | # | League |
|---|---|---|---|
| 1 | 🇮🇱 Ligat Ha'Al (Israel) | 11 | 🏴 Scottish Premiership |
| 2 | 🏴 Premier League (England) | 12 | 🇦🇹 Austrian Bundesliga |
| 3 | 🇪🇸 La Liga | 13 | 🇨🇭 Swiss Super League |
| 4 | 🇮🇹 Serie A | 14 | 🇬🇷 Greek Super League |
| 5 | 🇩🇪 Bundesliga | 15 | 🇩🇰 Danish Superliga |
| 6 | 🇫🇷 Ligue 1 | 16 | 🇸🇦 Saudi Pro League |
| 7 | 🇵🇹 Primeira Liga | 17 | 🇺🇸 MLS |
| 8 | 🇳🇱 Eredivisie | 18 | 🇧🇷 Brasileirão |
| 9 | 🇧🇪 Belgian Pro League | 19 | 🇦🇷 Argentine Primera |
| 10 | 🇹🇷 Süper Lig | 20 | 🏴 English Championship |

Roughly 370 clubs / ~10,000 players. With a ~100 requests/day free API, the initial import takes a few days (resumable script, run locally — not on Vercel).

### 5.2 Ratings — two numbers per player
- **World rating (stored):** how good the player is compared to every player in the game.
- **League rating (derived):** where the player ranks *inside their own league*. A Maccabi Haifa star might be **League 88 / World 68** — great in Israel, average in Europe. Both are shown on player cards; the match engine uses the world rating.
- **How ratings are produced:**
  - **Top ~1,000 players ("researched"):** rated by researching public info online — awards, recent stats (goals, assists, minutes), market value, international caps, club level. We do **not** copy EA FC / FM ratings (copyrighted data).
  - **Everyone else ("formula"):** computed from league strength × club reputation × market value × age × minutes played.
  - **Admin** can tune and lock any player.

### 5.3 Name translation policy (keeps the work small)
| Who | Hebrew | Arabic | Otherwise |
|---|---|---|---|
| All Ligat Ha'Al players & Israeli players abroad | ✅ | ✅ (after launch) | — |
| Stars of top clubs abroad (~300, e.g. Real Madrid, Barcelona, Man City, Liverpool, Arsenal, Bayern, PSG, Inter, Juventus…) | ✅ | ✅ (after launch) | — |
| Everyone else | — | — | English |
Club & league names are translated for all 20 leagues (~390 names, a small job).

### 5.4 What we will NOT use
Official crests, kits, player photos, league logos/branding. Generated crests/kits in club colours + generated avatars. Footer disclaimer: "Not affiliated with any club, league or player."

### 5.5 Updates
Re-sync each transfer window (summer & winter), run manually. New careers use the newest snapshot; existing saves keep their own world.

---

## 6. Game Design

### 6.1 Player Career

**Start flow**
1. Create player: name, nationality (default Israel), position, preferred foot, look.
2. **Choose a league** (any of the 20).
3. Get **2–3 offers from clubs in that league** — all to their **youth team (U19)**. Offers are mixed: e.g. one big club (fewer minutes, slower path) and one or two smaller clubs (faster path to the first team).
4. A **hidden potential** (randomly rolled, e.g. 60–95, weighted toward the middle) is assigned. **The player never sees it.**

**Offers & wage negotiation (decided 2026-11-13)**
- The **3 offers** each show club, team level (youth/first team), expected playing time, **contract length and weekly wage**.
- On any offer you can **"Ask for more"** → a **roulette spin, 50% / 50%**: win = the wage goes up (~+15–30%); lose = the wage stays and that club's **trust** in you drops (you start lower in the coach's pecking order). You can still sign, or pick another offer.

**Career status bars (always visible on the career screen)**
| Bar | Meaning | Moves with |
|---|---|---|
| Trust (coach) | How much the coach believes in you → minutes, starts | Performances, choices, negotiation result |
| Form | Your recent match ratings | Last ~5 matches |
| Training | How well you've been training | Training choices, trivia points |
| Fitness | Energy / injury risk | Minutes played, rest, injuries |
| Morale | Happiness | Playing time, results, wage, story choices |
| Fans | Supporters' love | Goals, big games, loyalty |

**Season flow — quick**
- A season runs in **two halves**: press **"Play first half of the season"** → matches are simulated → a **highlight reel** of your best moments → mid-season inbox/story events → **"Play second half"** → end of season.
- **2D highlights:** your goals, assists and big moments are shown on an animated 2D pitch (dots/kits, ball movement, goal celebration, commentary line). Always a **Skip** button on the side. Must look good and run smoothly on phone and PC.

**End of every season**
1. **Season review** (stats, rating change, trophies, team position).
2. **Talk with the manager** — about your form and role next season; 2–3 reply choices that affect trust/morale ("I want more minutes" / "I'll work harder" / "I'm thinking of leaving").
3. **Talk with your agent** — offers received this season, or contract renewal:
   - The club **offers a renewal** if you had a good season / they need you; **no renewal** if your contract has run out and they don't need you (you then must pick another offer).
   - Offers depend on your season (rating, form, goals) and **the agent's quality**.

**Agents**
- You choose and **hire an agent** (can switch later). Each agent shows **commission % of your wage** (e.g. 3%–15%) and a quality level.
- **Better agents → more and better offers** (bigger clubs, abroad sooner, higher wages) but take a bigger cut. No agent = few, weaker offers.

**Hidden potential design (so players don't quit instantly)**
- Starting attributes are similar for everyone, so a low-potential roll doesn't feel bad on day one.
- Potential controls how *fast* you grow and your *ceiling*, revealed only indirectly:
  - Coach/scout messages give **vague hints** ("The academy staff see something special in you").
  - Strong growth → called up from youth to the first team sooner.
- **High potential → interest from bigger clubs**: first from stronger clubs in your league, then **from abroad (European clubs)** as your world rating rises. Offer logic uses `league.strength` and `club.reputation`.
- Low potential is still fun: you can become a club legend at a smaller club, captain, win the Israeli cup, etc. Good choices (training, decisions in matches) can beat potential slightly (+3–5).

**Progression**
Youth team → first-team bench → starter → transfers/loans → national team call-up (Phase 2) → **retirement → manager**.

**Story + stats, combined (decided).** Every week has one of each layer, so neither dominates:
| Layer | What it is | Example |
|---|---|---|
| **Stats** | Attributes, ratings (league + world), match ratings, goals/assists, market value | Shooting 71 → 74 after a training block |
| **Story** | Inbox events with 2–3 choices that have real effects (morale, coach trust, fan love, offers) | "The coach benched you for the derby. Accept it / Ask for a meeting / Complain to the press" |
| **Match moments** | 2–4 decisions per first-team match, success based on attributes + form | "One-on-one with the keeper: Shoot low / Chip / Pass to teammate" |
| **Trivia** | Occasional football question → small training boost (§6.4) | "Who won the 2005 Champions League final?" |
Story events are written as templates with variables (club, rival, coach, teammate) so they feel personal and are fully translatable. MVP target: ~60 story events.

**Injuries**
- After every match (and occasionally in training) there is an injury roll. Chance depends on **physical attribute, fitness/fatigue, age, and playing style choices** (e.g. "go in hard for the tackle" in a match moment adds risk).
- Severity table (tunable constants):

| Severity | Share of injuries | Time out | Lasting effect |
|---|---|---|---|
| Minor (knock, strain) | ~70% | 1–2 weeks | None |
| Moderate (muscle tear, sprain) | ~25% | 3–8 weeks | None; slight form dip on return |
| Serious (ACL, fracture) | ~5% | 4–9 months | May lose 1–3 pace/physical points |
| **Career-ending** | **very rare** — a small slice of serious injuries | — | Forced retirement |

- **Career-ending injuries are rare:** target roughly **1 in 50–100 careers**. The chance grows with age and with previous serious injuries; **never before age 23**.
- Story choices around injuries: *"Rush back for the cup final (risk re-injury) / Take full recovery time"*, *"Surgery now / Try physio first"*.
- While injured, sessions skip forward quickly (summary of team results + inbox events) so being injured never feels like a waste of a session.

**Retirement**
- A **"Retire" button** is always available in the club page (with confirmation). From age 33 the game starts suggesting it as attributes decline.
- **Forced retirement:** at age **43**, or after a **career-ending injury** (rare).
- Retirement screen: career summary (clubs, apps, goals, trophies, peak world rating, best season, injury history), saved to `career_history`.
- Then: **"Continue as a manager"** or **"End career"** — available after any kind of retirement, including injury.

**Session target (10–15 min):** ~half a season per session — youth matches are quick-simmed with a summary; first-team matches have 2–4 decision moments each. Every session ends with a hook (an offer, a call-up, a promotion decision).

### 6.2 Manager Career (casual for MVP)
- **New manager:** pick any of the 20 leagues → any club. Board sets an objective based on club reputation.
- **Ex-player manager (from retirement):** the world continues from the same day. You get **2–3 job offers** based on your playing career:
  - Legend at a club (many seasons / trophies there) → offer from that club (often their youth team or as first-team coach if reputation is high).
  - High peak world rating → offers from bigger clubs.
  - Average career → offers from smaller clubs in the leagues you played in.
  - Small bonus from your playing reputation: players respect you more (+morale at start), board gives more patience in season 1.
- **Casual depth:** lineup, formation, mentality, subs, transfers across all 20 leagues, quick-sim with highlights. Basic injuries (players miss matches; same injury model as §6.1). No detailed finances/scouting in MVP.
- **Getting sacked & the end of a career:**
  - Board confidence drops with bad results vs. the objective → warning messages → sacked.
  - After a sacking there is a short **job-hunting period** (a few in-game weeks). Offers come only if your reputation is good enough for some club (usually smaller clubs than the one that sacked you).
  - **No offers → the career ends** (`status = 'finished'`), with a final summary saved to `career_history` and shown on the profile.
  - If offers do come, you can accept one and keep going in the same save.
- **Match presentation:** text commentary only in MVP; simple 2D pitch with dots later (decided).
- **Session target:** ~half a season per session.

### 6.3 Daily Challenge (decided 2026-11-13 — replaces the standalone Trivia mode)
- **No standalone Trivia mode.** Trivia exists only inside the careers (§6.4).
- Every day everyone gets the **same random low-tier club** with an **objective** shown at the start (e.g. "Qualify for Europe", "Avoid relegation", "Win the cup").
- Played with the career engine (manager-style, quick), one attempt per day.
- **Sign-in required to compete**; daily **leaderboard** (+ weekly / all-time).

### 6.3b Trivia question bank (used only inside the careers)
- **Difficulty:** Medium / Hard / Expert, growing with the career. Topics chosen at career start (default Israeli football + Champions League).

| Group | Topics |
|---|---|
| 🇮🇱 Israeli football | Ligat Ha'Al · Israel national team · Israeli players abroad · State Cup & Toto Cup · Israeli clubs in Europe · Israeli football history & legends |
| 🇪🇺 European club football | Champions League · Europa & Conference League · Premier League · La Liga · Serie A · Bundesliga · Ligue 1 |
| 🌍 International | World Cup · Euros · Copa America · Ballon d'Or & awards |
| ⚽ General | Legends · Transfers & records · Stadiums & clubs · Managers · Guess the player (career path) |

**Question bank — big, so it doesn't repeat**
| Source | How | Expected size |
|---|---|---|
| **AI-generated + fast fact-check** | Generated by topic & difficulty, each with a reference (`source_ref`), then checked automatically (below) | 2,000+ at launch |
| **Template questions from data** | Auto-built from structured facts: past CL/World Cup winners & finals, Ballon d'Or winners, top scorers, Israeli champions by year, "Which club did X play for before Y?" | Thousands, regenerated after each data sync |
| **Open Trivia DB** (CC BY-SA, attribution required) | Import football questions, filter for mid–hard | Few hundred |
| **Manual / admin** | Admin panel, later user submissions | Ongoing |

**Fast fact-check (decided — no slow manual review of every question):**
1. Each generated question must come with a source (e.g. Wikipedia / official competition page).
2. An automated second pass re-checks the answer against the source; any disagreement or unclear answer → question is dropped (not fixed by hand).
3. Template questions come straight from structured data, so they're correct by construction.
4. Quick spot-check of a random sample (~5%) per batch; if a batch has many errors, the whole batch is regenerated.
5. After launch: "Report question" button + auto-flagging handle anything that slipped through.

Arabic: same questions and same answers, translated (after launch). Anti-repetition via `user_seen_questions`; questions with suspicious stats (95% correct = too easy, or many reports) are auto-flagged.

### 6.4 Trivia inside the careers
The same question bank is used inside both career modes.

**When questions appear**
- At career start the user picks trivia topics (topic list in §6.3b, default Israeli football + Champions League). They can be changed later in settings.
- A question pops up **occasionally**: roughly every 3–4 matches/quick-sims, plus 1–2 in the off-season between seasons. Never in the middle of a match. Optional "Skip" button (no reward, no penalty).
- 20-second timer; difficulty grows with the career (Medium early, Hard/Expert later).

**Rewards — helpful, but never game-breaking**
| Mode | Correct answer gives | Wrong answer |
|---|---|---|
| Player Career | **+1 training point** (spent on the training screen to boost an attribute a little faster) | Nothing lost |
| Manager Career | Small boost for the next match: **team training bonus** (+1–2% team strength) or **+morale** for one player | Nothing lost |

**Caps so it stays balanced (decided: helps, but never decides your career)**
- Max **~8 training points per season**, total effect ≈ **+2–3 attribute points per season** at most.
- All numbers are tunable constants in one file (`lib/engine/balance.ts`), so we can adjust after playtesting.
- Trivia boosts can **never raise a player above his hidden potential** (potential still decides the ceiling) — they only help reach it a bit faster.
- Manager match boosts don't stack; one active at a time.
- An expert who answers everything correctly ends up maybe 2–4 world-rating points better over a whole career — noticeable, not decisive.

**Integrity:** correctness is checked by the same server RPC as normal trivia (the answer is never sent to the browser), and the question counts toward `user_seen_questions` so careers don't repeat questions either.

---

## 7. Feature List by Phase

### Phase 0 — Foundation ✅ (completed 2026-11-12)
- [x] Next.js 16 + TS + Tailwind 4 + shadcn/ui scaffold
- [x] i18n with `he` (default), `en`; `ar` wired but hidden until ready; RTL/LTR switching; locale cookie + profile
- [x] Fonts (Heebo / Cairo), theme (system/light/dark), layout, mobile bottom nav
- [x] Supabase migrations (`profiles`, RLS, `is_admin()`, sign-up trigger), TS types
- [x] Supabase project created & migrations pushed
- [x] Auth: email magic link working end-to-end (Google sign-in coded; needs Google OAuth client — optional)
- [x] GitHub (LidorHanoh/football-star) → Vercel auto-deploys — live at https://football-star-one.vercel.app
- [x] Title "כוכב כדורגל" / "Football Star" / "نجم كرة القدم" per language
- [x] Brand: owner's logo, favicon/app icons/share image, navy + silver palette

### Phase 1 — MVP (Hebrew + English)
**Data**
- [x] Researched 2026/27 league line-ups; squads from Transfermarkt (API-Football free plan stops at 2024)
- [ ] Import 20 leagues into Supabase
- [ ] Rating formula + researched ratings for top ~1,000 players; league-rating view
- [ ] Hebrew names: Ligat Ha'Al + Israelis abroad + ~300 stars; all club/league names
- [ ] Generated crests/kits; disclaimer

**Trivia**
- [ ] Topic picker (multi-select) + difficulty (Medium/Hard/Expert)
- [ ] 10-question rounds, timer, streak scoring, server-side validation
- [ ] Results with explanations; anti-repetition
- [ ] Daily challenge + daily streak
- [ ] Weekly / all-time / daily leaderboards
- [ ] Question bank: 2,000+ generated + fast fact-check pipeline + template questions
- [ ] Admin: question CRUD, bulk import, reports

**Player Career**
- [ ] Create player → choose league → 3 offers with wages → "ask for more" 50/50 roulette (lose = trust drop) → choose trivia topics
- [ ] Status bars: trust, form, training, fitness, morale, fans
- [ ] Season in two halves; 2D animated highlights of your moments with a Skip button (phone + PC)
- [ ] End-of-season talk with the manager (choices) + talk with the agent (offers / renewal / no renewal)
- [ ] Agents: hire/switch, commission %, quality → offer quality
- [ ] Hidden potential + vague hints
- [ ] Youth team quick-sim → promotion to first team
- [ ] First-team matches with decision moments; ratings, goals, assists
- [ ] ~60 story events with choices (inbox)
- [ ] Weekly training → growth by age & potential
- [ ] Career trivia questions → training points (capped, balanced)
- [ ] Injuries (minor / moderate / serious) + injury story choices
- [ ] Rare career-ending injury → forced retirement
- [ ] Transfer offers: domestic bigger clubs, then European clubs
- [ ] League + world rating shown for the player
- [ ] Retire button + forced retirement at 43 + career summary
- [ ] "Continue as a manager" → job offers based on playing career, same world
- [ ] Autosave (guest = localStorage)

**Manager Career (casual)**
- [ ] Any league / any club; formation, lineup, mentality
- [ ] Match sim with text ticker + quick-sim
- [ ] Fixtures, table, transfers across 20 leagues, board objective
- [ ] Basic injuries for squad players
- [ ] Sacking → job-hunting period → new job or career ends
- [ ] Career trivia questions → small match/morale boosts (capped)
- [ ] Autosave

**General**
- [ ] Guest play → migrate on sign-up; profile with stats; SEO + `hreflang`; privacy & terms

### Phase 1.5 — Arabic
- [ ] Arabic UI strings, Arabic fonts, RTL QA
- [ ] Arabic translation of all published questions & answers
- [ ] Arabic names for the same players that have Hebrew names

### Phase 2 — Depth & Retention
- Trivia: Survival, guess-the-player / career-path questions, question reporting, adaptive difficulty
- Player Career: national team (Israel or chosen nation), contract negotiation, agent, loans, interviews, Hall of Fame, more story events
- Match view: simple 2D pitch with moving dots (text commentary stays as an option)
- Manager Career: morale & form, detailed injuries & medical staff, youth academy, finances, cups, European competitions, job offers while employed
- XP, levels, achievements; shareable result images; PWA

### Phase 3 — Social
- Async 1v1 trivia duels (then realtime), friends & friend leaderboards, weekly tournaments, user-submitted questions with moderation, cosmetics (earned, never bought)

---

## 8. Free-Tier Constraints & Risks

| Limit / risk | Mitigation |
|---|---|
| Vercel Hobby: non-commercial only | ✅ Not planning to make money — fine |
| Vercel Cron: once per day | One daily job does everything |
| Supabase DB 500 MB (~10k players + saves + questions) | JSONB saves, 3 saves/mode/user, prune stale guest data, `user_seen_questions` capped to last ~2,000 per user |
| Supabase pauses after 7 idle days | Daily cron ping |
| Supabase egress 5 GB/mo | SVG graphics, cache world data with ISR |
| Football data API free limits | Import locally over several days, cache raw responses |
| Real player names in a game (legal grey area) | Non-commercial, no logos/photos/copied ratings, disclaimer, quick takedown on request |
| Wrong trivia facts | Source required + automated fast fact-check + 5% spot-check; report button; auto-flag by stats |
| Audience includes kids | No chat, minimal data, username filter, privacy policy in plain language |

---

## 9. Answered Decisions

| # | Decision |
|---|---|
| World | Real leagues, clubs and player names |
| Leagues | The 20 leagues in §5.1, incl. Ligat Ha'Al (confirmed) |
| Ratings | Researched for big players, formula for others; **two ratings: league & world** |
| Player Career start | Choose league → 2–3 youth-team offers → hidden random potential → bigger & European offers if high |
| Player Career style | Story choices + stats + match moments, all combined |
| Retirement | Retire button anytime; forced at **43** or by a **rare career-ending injury**; continue as a manager in the same world |
| Injuries | In MVP: minor / moderate / serious, plus rare career-ending |
| Manager Career | Casual for MVP; sacked with no offers → **career ends** |
| Match view | Text commentary for MVP, 2D pitch later |
| Trivia | **Only inside the careers** (no standalone mode, decided 2026-11-13); medium–hard; Israeli focus |
| Career trivia | Occasional questions inside both careers → small, capped, balanced boosts — helps but doesn't decide |
| Questions | Big bank from online sources + generation; **fast automated fact-check**; Arabic = same Q&A translated |
| Guests | Can play without an account (account for leaderboards & cloud saves) |
| Name | "כוכב כדורגל" in Hebrew; per-language title |
| Domain | None yet → `*.vercel.app` for now |
| Accounts | User has GitHub, Vercel and Supabase accounts |
| Translation | Hebrew for Israeli league + top stars + all clubs; rest in English |
| Session length | 10–15 minutes |
| Arabic | Shortly after launch (Phase 1.5) |
| Audience / money | Everyone; non-commercial |

## 10. Open Questions

No blocking questions left — the plan is ready for Phase 0.

## 11. Reminders / Later Discussions

- [x] ~~Logo & branding~~ — logo provided 2026-11-12.
- [ ] Domain — decide whether to buy one later (e.g. when the site launches publicly).
- [ ] Playtest balance numbers (`balance.ts`): trivia boosts, injury rates, potential range, sacking thresholds.
