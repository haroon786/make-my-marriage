import Link from "next/link";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { Icon } from "@/components/home/icon";

export function WorkspaceHeader({ dashboard = false }: { dashboard?: boolean }) {
  return <header className="border-b border-line bg-surface">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold text-accent sm:text-xl"><Icon name="heart" className="size-6 text-gold-dark" />Make My Marriage</Link>
      <nav aria-label="Account" className="flex items-center gap-5 text-sm"><Link href={dashboard ? "/app" : "/"} className="py-3 text-muted hover:text-accent">{dashboard ? "Back to dashboard" : "Back to home"}</Link><LogoutButton /></nav>
    </div>
  </header>;
}
