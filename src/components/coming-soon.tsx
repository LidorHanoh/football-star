import { HammerIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

export async function ComingSoon({ title, description }: { title: string; description?: string }) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <HammerIcon className="size-7" aria-hidden />
      </span>
      <h1 className="font-heading text-3xl font-extrabold">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm">
        <strong>{dict.comingSoon.title}.</strong> {dict.comingSoon.body}
      </p>
      <Link href={`/${locale}`} className={buttonVariants({ variant: "outline" })}>
        {dict.comingSoon.backHome}
      </Link>
    </section>
  );
}
