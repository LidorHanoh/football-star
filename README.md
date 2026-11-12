# כוכב כדורגל · Football Star

Football game website — Trivia, Player Career and Manager Career — in Hebrew (default), English and Arabic.
See [PLAN.md](PLAN.md) for the full product plan.

## Stack
Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · shadcn/ui · Supabase (Auth + Postgres) · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev                  # http://localhost:3000 -> redirects to /he
```

The site runs without Supabase too (guest-only, sign-in shows "not configured").

## Project layout

```
src/
  proxy.ts                 locale redirect (cookie → Accept-Language → he) + Supabase session refresh
  i18n/
    config.ts              locales, RTL, enabled locales (Arabic hidden until Phase 1.5)
    get-dictionary.ts      getLocale()/getDictionary() via next/root-params (Server Components)
    dictionaries/*.json    UI strings — he.json is the source of truth for keys
  app/[locale]/            every page lives under /he, /en, /ar
  components/              header, bottom nav, locale switcher, theme toggle, ui/ (shadcn)
  lib/supabase/            browser / server / proxy clients + database types
supabase/migrations/       SQL migrations (RLS on every table)
```

## Adding a UI string
Add the key to **all three** files in `src/i18n/dictionaries/` (TypeScript types come from `he.json`).
In Server Components: `const dict = await getDictionary()`. Pass the strings a Client Component needs as props.

## RTL rules
Use logical utilities only: `ms-* me-* ps-* pe-* start-* end-* text-start`. Directional icons get `rtl:-scale-x-100` (or `ltr:` for icons drawn pointing left).

## Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push     # apply migrations to the linked project (--remote)
npm run db:types    # regenerate src/lib/supabase/database.types.ts
```

## Scripts
`dev` · `build` · `start` · `lint` · `typecheck` · `db:push` · `db:types`
