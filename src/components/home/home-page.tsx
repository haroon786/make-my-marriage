import { HomeNavigation, StartPlanningButton } from "./home-actions";
import { Icon, type IconName } from "./icon";
import { previewTasks } from "./preview-data";
import { container, eyebrow, secondaryButton } from "./styles";
import { WeddingPreview } from "./wedding-preview";
import { WorkspacePreview } from "./workspace-preview";

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      href="#top"
      aria-label="Make My Marriage home"
      className="flex shrink-0 items-center gap-2.5"
    >
      <span
        className={`flex size-9 items-center justify-center rounded-lg border border-gold/30 ${inverse ? "bg-white/5" : "bg-accent"}`}
      >
        <Icon name="heart" className="size-5 text-gold" />
      </span>
      <span>
        <span
          className={`block font-serif text-[17px] font-semibold leading-tight ${inverse ? "text-white" : "text-accent"}`}
        >
          Make My Marriage
        </span>
        <span
          className={`mt-1 block text-[8px] font-bold tracking-[0.17em] ${inverse ? "text-gold" : "text-gold-dark"}`}
        >
          YOUR WEDDING. TOGETHER.
        </span>
      </span>
    </a>
  );
}

function SectionHeading({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
      <p className={eyebrow}>{label}</p>
      <h2 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight sm:text-[40px]">
        {title}
      </h2>
      {children && (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
          {children}
        </p>
      )}
    </div>
  );
}

function FeatureIcon({ name }: { name: IconName }) {
  return (
    <span className="mb-5 inline-flex rounded-lg border border-gold/20 bg-gold-light/60 p-2.5 text-accent">
      <Icon name={name} />
    </span>
  );
}

function Features() {
  return (
    <section id="features" className={`${container} py-20 sm:py-24`}>
      <SectionHeading
        label="Made for every little detail"
        title="Many celebrations. A little less chaos."
      >
        From the first family meeting to the final farewell, bring your plans
        and your people together in one thoughtful space.
      </SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-6">
          <FeatureIcon name="calendar" />
          <h3 className="font-serif text-xl text-accent">
            Every ceremony, in place
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Haldi, Mehndi, Sangeet and the big day. Keep dates, venues and dress
            codes together.
          </p>
          <div className="mt-6 space-y-2 rounded-lg bg-blush/60 p-3 text-[11px]">
            {[
              ["Haldi ceremony", "15 Dec · 10 AM"],
              ["Sangeet night", "16 Dec · 7 PM"],
              ["Wedding ceremony", "17 Dec · 11 AM"],
            ].map(([name, time]) => (
              <div
                key={name}
                className="flex justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
              >
                <span className="font-semibold">{name}</span>
                <span className="text-gold-dark">{time}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-line bg-surface p-6">
          <FeatureIcon name="people" />
          <h3 className="font-serif text-xl text-accent">
            Two families. One team.
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Share the planning with the people you trust. Assign tasks so
            everyone knows their part.
          </p>
          <div className="mt-6 rounded-lg border border-line bg-blush/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {["A", "P", "R", "N"].map((letter, i) => (
                  <span
                    key={letter}
                    className={`flex size-8 items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold ${i % 2 ? "bg-gold-light text-gold-dark" : "bg-accent text-white"}`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-semibold text-accent">
                Better, together
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              One shared wedding workspace.
            </p>
          </div>
        </article>
        <article className="rounded-xl border border-line bg-surface p-6">
          <FeatureIcon name="wallet" />
          <h3 className="font-serif text-xl text-accent">
            Expenses, without the guesswork
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Record your wedding expenses by category and keep vendor details
            close at hand.
          </p>
          <div className="mt-6 space-y-2 rounded-lg bg-blush/60 p-3 text-[11px]">
            {[
              ["Flowers & decor", "₹50,000"],
              ["Photography", "₹80,000"],
              ["Catering", "₹1,20,000"],
            ].map(([name, amount]) => (
              <div
                key={name}
                className="flex justify-between border-b border-line pb-2 last:border-0 last:pb-0"
              >
                <span className="text-muted">{name}</span>
                <span className="font-semibold text-accent">{amount}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: "mail",
            title: "Invitations made personal",
            text: "Email invitations, manual WhatsApp sharing and a simple RSVP link.",
          },
          {
            icon: "store",
            title: "Your vendors, together",
            text: "Discover nearby providers and save the contacts you want to work with.",
          },
          {
            icon: "image",
            title: "Memories worth keeping",
            text: "A private gallery, event albums and a QR code for sharing photos.",
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="flex gap-3 rounded-xl border border-line bg-surface p-5"
          >
            <Icon
              name={feature.icon as IconName}
              className="mt-1 size-5 text-accent"
            />
            <div>
              <h3 className="text-sm font-bold text-accent">{feature.title}</h3>
              <p className="mt-2 text-xs leading-6 text-muted">
                {feature.text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DualExperience() {
  return (
    <section
      id="dual-experience"
      className="border-y border-line bg-blush/35 py-20 sm:py-24"
    >
      <div className={container}>
        <SectionHeading
          label="The best of both worlds"
          title="One celebration. Two thoughtful experiences."
        >
          A private space for the planning. A beautiful, simple experience for
          the people celebrating with you.
        </SectionHeading>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={eyebrow}>For the couple & family</p>
              <span className="flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-[10px] font-semibold text-accent">
                <Icon name="lock" className="size-3" />
                Members only
              </span>
            </div>
            <h3 className="mt-3 font-serif text-2xl">
              Your private planning workspace
            </h3>
            <ul className="mt-6 space-y-5">
              {[
                [
                  "A shared plan",
                  "Events, assigned tasks and guest invitations, all in one place.",
                ],
                [
                  "Clear responsibilities",
                  "Admins manage membership. Your planning team shares the work.",
                ],
                [
                  "The details within reach",
                  "Track expenses, save vendors and personalise your wedding website.",
                ],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <Icon name="check" className="mt-0.5 size-4 text-accent" />
                  <p className="text-sm leading-6 text-muted">
                    <strong className="font-semibold text-ink">{title}.</strong>{" "}
                    {text}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-7 rounded-lg border border-line bg-blush/40 p-4">
              <div className="mb-3 flex justify-between text-[10px] font-bold text-accent">
                <span>A LITTLE TEAMWORK</span>
                <Icon name="task" className="size-3.5" />
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span>Choose the Sangeet playlist</span>
                <span className="rounded-full bg-gold-light px-2 py-1 text-[10px] text-gold-dark">
                  Ananya
                </span>
              </div>
            </div>
          </article>
          <article className="rounded-xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={eyebrow}>For your loved ones</p>
              <span className="flex items-center gap-1 rounded-full bg-gold-light px-2.5 py-1 text-[10px] font-semibold text-gold-dark">
                <Icon name="heart" className="size-3" />
                No account needed
              </span>
            </div>
            <h3 className="mt-3 font-serif text-2xl">
              A warm welcome for every guest
            </h3>
            <ul className="mt-6 space-y-5">
              {[
                [
                  "A personal invitation",
                  "Guests open their own link, see invited events and confirm attendance.",
                ],
                [
                  "All the essentials",
                  "Your wedding website brings dates, venue maps and dress codes together.",
                ],
                [
                  "Share in the memories",
                  "Guests can view and upload photos through your private gallery link.",
                ],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <Icon name="check" className="mt-0.5 size-4 text-gold-dark" />
                  <p className="text-sm leading-6 text-muted">
                    <strong className="font-semibold text-ink">{title}.</strong>{" "}
                    {text}
                  </p>
                </li>
              ))}
            </ul>
            <a
              href="#showcase"
              className="mt-7 flex items-center justify-between gap-3 rounded-lg border border-line bg-blush/40 p-4 text-xs font-semibold text-accent transition hover:bg-blush"
            >
              <span className="flex items-center gap-2">
                <Icon name="globe" className="size-4" />
                Ashu & Priya’s sample wedding
              </span>
              <Icon name="arrow" className="size-4" />
            </a>
          </article>
        </div>
        <p className="mt-6 text-center text-xs leading-6 text-muted">
          Near or far, loved ones can also join through your embedded YouTube
          livestream.
        </p>
      </div>
    </section>
  );
}

function FamilySection() {
  return (
    <section className="border-y border-line bg-blush/50 py-16 sm:py-20">
      <div className={`${container} grid items-center gap-10 md:grid-cols-2`}>
        <div>
          <p className={eyebrow}>Less chasing. More celebrating.</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            Built for how Indian
            <br className="hidden sm:block" /> families actually plan.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted">
            Your parents, siblings and closest friends all have a part to play.
            Give every helping hand a place in the plan, without losing the joy
            along the way.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            {[
              "Invite your trusted people into one workspace.",
              "Assign tasks with clear owners and due dates.",
              "Keep the celebration’s details easy to find.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <span className="rounded-full bg-accent p-0.5 text-white">
                  <Icon name="check" className="size-3" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-xl text-accent">
              A little help from your people
            </h3>
            <Icon name="people" className="text-gold-dark" />
          </div>
          {previewTasks.map((task) => (
            <div
              key={task.title}
              className="flex items-center gap-3 border-t border-line py-4"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${task.done ? "bg-sage text-accent" : "bg-gold-light text-gold-dark"}`}
              >
                {task.assignee[0]}
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold">{task.title}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {task.assignee} · Due {task.due}
                </p>
              </div>
              <span
                className={`rounded px-2 py-1 text-[9px] font-semibold ${task.done ? "bg-sage text-accent" : "bg-blush text-muted"}`}
              >
                {task.done ? "Done" : "To do"}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted">
            Sample tasks · a glimpse of your shared workspace
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className={`${container} py-20 sm:py-24`}>
      <SectionHeading
        label="From ‘yes’ to ‘I do’"
        title="A beautiful beginning, in three steps."
      >
        Start with the essentials. Bring your family in. Make the celebration
        your own.
      </SectionHeading>
      <div className="grid gap-8 md:grid-cols-3">
        {[
          {
            number: "01",
            title: "Make it your wedding",
            text: "Create your wedding workspace and add your dates, events and venues.",
            icon: "heart",
          },
          {
            number: "02",
            title: "Bring your people together",
            text: "Invite your planning team, assign tasks and organise your guest list.",
            icon: "people",
          },
          {
            number: "03",
            title: "Share the celebration",
            text: "Send invitations, collect RSVPs and share your wedding website and gallery.",
            icon: "mail",
          },
        ].map((step) => (
          <article
            key={step.number}
            className="relative border-t border-line pt-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="font-serif text-4xl text-gold/80">
                {step.number}
              </span>
              <Icon
                name={step.icon as IconName}
                className="size-6 text-accent"
              />
            </div>
            <h3 className="font-serif text-xl text-accent">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <div id="top">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-white p-3 text-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div
          className={`${container} relative flex h-[76px] items-center justify-between gap-5`}
        >
          <Brand />
          <HomeNavigation />
        </div>
      </header>
      <main id="main-content">
        <section className="relative overflow-hidden pt-14 pb-12 sm:pt-20 sm:pb-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -z-10 h-96 w-full max-w-4xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,#e7d6ad55,transparent_68%)]"
          />
          <div className={`${container} text-center`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold-light/55 px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-gold" />
              <p className="text-[9px] font-bold tracking-[0.12em] text-gold-dark sm:text-[10px]">
                A LITTLE MORE JOY. A LOT LESS WEDDING CHAOS.
              </p>
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl font-serif text-[clamp(2.8rem,5.8vw,4.8rem)] font-medium leading-[1.12] tracking-[-0.045em]">
              Your wedding.
              <br />
              One shared{" "}
              <em className="relative font-medium text-accent decoration-gold/65 decoration-1 underline-offset-8 underline">
                workspace.
              </em>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
              Plan the celebrations, bring your families together, and share
              every beautiful detail — from the first invitation to the last
              photograph.
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <StartPlanningButton />
              <a href="#workspace" className={secondaryButton}>
                <span className="rounded-full border border-gold/50 p-0.5 text-gold-dark">
                  <Icon name="play" className="size-3.5" />
                </span>
                Explore the workspace
              </a>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-[10px] text-muted sm:text-xs">
              {[
                { icon: "people", text: "Made for both families" },
                { icon: "mail", text: "Personal guest invitations" },
                { icon: "heart", text: "No app download for guests" },
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-1.5">
                  <Icon
                    name={item.icon as IconName}
                    className="size-3.5 text-accent"
                  />
                  {item.text}
                </span>
              ))}
            </div>
            <WorkspacePreview />
          </div>
        </section>
        <div className="border-y border-line/70 py-7">
          <div className={container}>
            <p className="text-center text-[9px] font-bold tracking-[0.2em] text-muted">
              FOR EVERY KIND OF INDIAN CELEBRATION
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-serif text-sm text-muted sm:gap-x-14 sm:text-base">
              {[
                "Intimate beginnings",
                "Hometown traditions",
                "Destination celebrations",
                "Two families, one story",
              ].map((text) => (
                <span key={text}>{text}</span>
              ))}
            </div>
          </div>
        </div>
        <Features />
        <DualExperience />
        <section id="showcase" className={`${container} py-20 sm:py-24`}>
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className={eyebrow}>A glimpse of your celebration</p>
              <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">
                Your story deserves
                <br />a beautiful place to begin.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
                Meet Ashu & Priya’s sample wedding website. A little inspiration
                for welcoming your own loved ones.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-line bg-blush px-3 py-2 text-[10px] font-semibold text-accent">
              <span className="size-1.5 rounded-full bg-gold" />
              Sample wedding website
            </span>
          </div>
          <WeddingPreview />
        </section>
        <FamilySection />
        <HowItWorks />
        <section className="relative overflow-hidden bg-accent px-5 py-16 text-center sm:py-20">
          <Icon name="flower" className="mx-auto mb-5 size-8 text-gold" />
          <p className="text-[10px] font-bold tracking-[0.2em] text-gold-light">
            BEGIN YOUR NEXT CHAPTER
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl leading-tight text-white sm:text-[42px]">
            Celebrate the traditions.
            <br />
            <em className="font-medium text-gold-light">
              Enjoy the togetherness.
            </em>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/75">
            Make room for what matters. Give your wedding plans a place where
            everyone comes together.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <StartPlanningButton className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold bg-gold px-5 py-3 text-sm font-bold text-forest transition hover:bg-gold-light" />
            <a
              href="#showcase"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore the sample wedding{" "}
              <Icon name="arrow" className="size-4" />
            </a>
          </div>
        </section>
      </main>
      <footer className="bg-forest py-10 text-white/65">
        <div
          className={`${container} flex flex-col justify-between gap-8 sm:flex-row`}
        >
          <div>
            <Brand inverse />
            <p className="mt-4 max-w-xs text-xs leading-6">
              Made with care for the celebrations
              <br />
              that bring us together.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-10 gap-y-4 text-xs"
          >
            <a href="#features" className="hover:text-white">
              Planning features
            </a>
            <a href="#showcase" className="hover:text-white">
              Wedding website
            </a>
            <a href="#dual-experience" className="hover:text-white">
              Family & guests
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
          </nav>
        </div>
        <div
          className={`${container} mt-8 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-[10px]`}
        >
          <p>© Make My Marriage. Made for your together.</p>
          <p>Homepage preview · all wedding details are illustrative.</p>
        </div>
      </footer>
    </div>
  );
}
