import Image from "next/image";
import logo from "../../public/logo-96.webp";

/** Header logo: round badge + site name in the current language. */
export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight">
      <Image src={logo} alt="" width={40} height={40} priority className="size-10 drop-shadow-[0_0_6px_color-mix(in_oklch,var(--primary)_45%,transparent)]" />
      <span className="hidden min-[380px]:inline">{name}</span>
    </span>
  );
}
