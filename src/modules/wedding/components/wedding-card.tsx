import { Icon } from "@/components/home/icon";
import { formatWeddingDate } from "../schemas";

export function WeddingCard({ brideName, groomName, weddingDate, timeZone, title, description, location }: {
  brideName: string; groomName: string; weddingDate: string; timeZone: string;
  title: string; description: string; location: { formattedAddress: string };
}) {
  return <div className="rounded-xl border border-gold/60 bg-blush p-2 shadow-sm">
    <div className="break-words rounded-lg border border-gold/40 px-6 py-10 text-center sm:px-8 sm:py-12">
      <Icon name="flower" className="mx-auto size-10 text-gold-dark" />
      <p className="mt-6 text-xs font-semibold tracking-widest text-gold-dark">{title || "WEDDING CELEBRATION"}</p>
      <h2 className="mt-5 font-serif text-3xl leading-snug text-accent sm:text-4xl">{brideName || "Bride"} <span className="italic text-gold-dark">&</span> {groomName || "Groom"}</h2>
      <div aria-hidden="true" className="my-6 text-gold-dark">──── ✦ ────</div>
      {description && <p className="mb-6 whitespace-pre-line text-sm leading-7 text-muted">{description}</p>}
      <div className="rounded-lg border border-line bg-surface p-5 text-sm leading-7">
        <p className="font-semibold text-accent">{formatWeddingDate(weddingDate)}</p>
        <p className="mt-1 text-muted">{location.formattedAddress || "Your city or venue"}</p>
        <p className="mt-2 text-xs text-muted">{timeZone}</p>
      </div>
    </div>
  </div>;
}
