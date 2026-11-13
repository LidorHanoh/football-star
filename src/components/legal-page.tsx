import type { Dictionary } from "@/i18n/get-dictionary";

export const CONTACT_EMAIL = "lidorhanoh123@gmail.com";

type LegalDoc = Dictionary["privacy"] | Dictionary["terms"];

/** Renders "{email}" placeholders in legal text as a mailto link. */
function withEmail(text: string) {
  const parts = text.split("{email}");
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary underline underline-offset-2" dir="ltr">
          {CONTACT_EMAIL}
        </a>
      )}
    </span>
  ));
}

export function LegalPage({ doc, legal }: { doc: LegalDoc; legal: Dictionary["legal"] }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 font-heading text-3xl font-extrabold">{doc.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {legal.lastUpdated}: {legal.date}
      </p>
      <p className="mb-8 leading-relaxed">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="mb-3 font-heading text-xl font-bold">{section.heading}</h2>
          {section.body.map((paragraph, i) => (
            <p key={i} className="mb-3 leading-relaxed text-muted-foreground">
              {withEmail(paragraph)}
            </p>
          ))}
        </section>
      ))}

      <p className="border-t pt-6 text-sm">
        {legal.contact}: {withEmail("{email}")}
      </p>
    </article>
  );
}
