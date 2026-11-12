import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

export default async function NotFound() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="font-heading text-6xl font-extrabold text-primary">404</p>
      <h1 className="font-heading text-2xl font-bold">{dict.notFound.title}</h1>
      <p className="text-muted-foreground">{dict.notFound.body}</p>
      <Link href={`/${locale}`} className={buttonVariants({ variant: "outline" })}>
        {dict.notFound.backHome}
      </Link>
    </section>
  );
}
