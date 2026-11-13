import { ArrowLeftIcon, CalendarCheckIcon, ClipboardListIcon, ShirtIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import heroLogo from "../../../public/logo.webp";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const t = dict.home;

  const modes = [
    { href: `/${locale}/player-career`, title: t.playerTitle, desc: t.playerDesc, icon: ShirtIcon, accent: "from-emerald-500/20" },
    { href: `/${locale}/manager-career`, title: t.managerTitle, desc: t.managerDesc, icon: ClipboardListIcon, accent: "from-sky-500/20" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-8 px-4 py-10 sm:py-16 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-start">
            <h1 className="text-silver max-w-2xl font-heading text-4xl font-extrabold leading-tight text-balance sm:text-5xl">{t.heroTitle}</h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">{t.heroSubtitle}</p>
            <Link href="#modes" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
              {t.playNow}
              <ArrowLeftIcon className="ltr:-scale-x-100" aria-hidden />
            </Link>
          </div>
          <Image
            src={heroLogo}
            alt={dict.meta.siteName}
            priority
            sizes="(min-width: 768px) 360px, 240px"
            className="size-60 shrink-0 drop-shadow-[0_0_40px_color-mix(in_oklch,var(--primary)_40%,transparent)] md:size-90"
          />
        </div>
      </section>

      {/* Game modes */}
      <section id="modes" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <h2 className="mb-5 font-heading text-2xl font-bold">{t.modesTitle}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {modes.map(({ href, title, desc, icon: Icon, accent }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "group flex h-full flex-col gap-3 rounded-xl border bg-gradient-to-b to-transparent p-5 transition hover:-translate-y-0.5 hover:shadow-md",
                  accent,
                )}
              >
                <span className="grid size-11 place-items-center rounded-lg bg-background shadow-sm">
                  <Icon className="size-6 text-primary" aria-hidden />
                </span>
                <h3 className="font-heading text-xl font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
                <span className="mt-auto text-xs font-semibold text-primary">{t.comingSoon}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Daily challenge teaser */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-center gap-4 rounded-xl border border-dashed p-5">
          <CalendarCheckIcon className="size-8 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-bold">
              {t.dailyTitle} <span className="ms-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{t.comingSoon}</span>
            </h2>
            <p className="text-sm text-muted-foreground">{t.dailyDesc}</p>
          </div>
        </div>
      </section>
    </>
  );
}
