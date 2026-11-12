import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).about.title };
}

export default async function AboutPage() {
  const dict = await getDictionary();
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-4 font-heading text-3xl font-extrabold">{dict.about.title}</h1>
      <p className="leading-relaxed text-muted-foreground">{dict.about.body}</p>
    </article>
  );
}
