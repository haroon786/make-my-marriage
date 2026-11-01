"use client";

import { useState } from "react";
import { Icon, type IconName } from "./icon";
import { ceremonies, previewTasks } from "./preview-data";

const tabs = [
  { name: "Overview", icon: "grid" },
  { name: "Events", icon: "calendar" },
  { name: "Tasks", icon: "task" },
  { name: "Guests & RSVPs", icon: "people" },
  { name: "Expenses", icon: "wallet" },
] as const satisfies ReadonlyArray<{ name: string; icon: IconName }>;
type View = (typeof tabs)[number]["name"];

function EventList() {
  return (
    <div className="space-y-2.5">
      {ceremonies.map((event) => (
        <div
          key={event.name}
          className="flex items-center gap-3 rounded-lg border border-line bg-white p-3"
        >
          <span className={`rounded-lg p-2.5 text-gold-dark ${event.tone}`}>
            <Icon name="flower" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-ink">{event.name}</h4>
            <p className="mt-1 text-[10px] text-muted">
              {event.date} · {event.time}
            </p>
            <p className="mt-1 text-[10px] text-muted">{event.venue}</p>
          </div>
          <span
            className={`hidden max-w-24 rounded-md px-2 py-1 text-[9px] font-semibold text-accent sm:block ${event.tone}`}
          >
            {event.dress}
          </span>
        </div>
      ))}
    </div>
  );
}

function GuestList() {
  return (
    <div className="space-y-3">
      {[
        {
          name: "Rajesh & family",
          initials: "RF",
          count: "4 attending",
          status: "Attending",
          color: "bg-sage text-accent",
        },
        {
          name: "Meenakshi & family",
          initials: "MF",
          count: "2 attending",
          status: "Attending",
          color: "bg-sage text-accent",
        },
        {
          name: "College friends",
          initials: "CF",
          count: "Up to 8 guests",
          status: "Awaiting reply",
          color: "bg-gold-light text-gold-dark",
        },
      ].map((guest) => (
        <div
          key={guest.name}
          className="rounded-lg border border-line bg-white p-3"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-blush text-[9px] font-bold text-accent">
              {guest.initials}
            </span>
            <span className="text-[11px] font-bold">{guest.name}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[10px]">
            <span className="text-muted">{guest.count}</span>
            <span className={`rounded px-2 py-1 font-semibold ${guest.color}`}>
              {guest.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskList() {
  return (
    <div className="space-y-3">
      {previewTasks.map((task) => (
        <div
          key={task.title}
          className="flex items-center gap-3 rounded-lg border border-line bg-white p-4"
        >
          <span
            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${task.done ? "border-accent bg-accent text-white" : "border-line"}`}
          >
            {task.done && <Icon name="check" className="size-3" />}
          </span>
          <div>
            <p className="text-xs font-semibold">{task.title}</p>
            <p className="mt-1.5 text-[10px] text-muted">
              {task.assignee} · Due {task.due}
            </p>
          </div>
          <span className="ml-auto text-[10px] text-muted">
            {task.done ? "Done" : "To do"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ExpenseList() {
  return (
    <div className="space-y-3">
      {[
        ["Venue", "₹2,00,000"],
        ["Catering", "₹1,20,000"],
        ["Photography", "₹80,000"],
        ["Decor & flowers", "₹50,000"],
      ].map(([label, amount]) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-lg border border-line bg-white p-4 text-xs"
        >
          <span className="flex items-center gap-3">
            <Icon name="wallet" className="size-4 text-gold-dark" />
            {label}
          </span>
          <span className="font-bold">{amount}</span>
        </div>
      ))}
      <p className="text-right text-xs font-bold text-accent">
        Total recorded: ₹4,50,000
      </p>
    </div>
  );
}

export function WorkspacePreview() {
  const [view, setView] = useState<View>("Overview");
  return (
    <div
      id="workspace"
      className="relative mx-auto mt-12 max-w-6xl rounded-2xl border border-line bg-white p-2 text-left shadow-[0_18px_70px_-25px_#604b333d] sm:mt-16 sm:p-3"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold" />
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-accent" />
          <span className="ml-3 truncate text-[10px] text-muted sm:text-xs">
            Make My Marriage / workspace
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-gold-light px-2.5 py-1 text-[9px] font-semibold text-gold-dark sm:text-[10px]">
          Interactive preview · sample data
        </span>
      </div>
      <div className="grid gap-3 pt-3 lg:grid-cols-[185px_1fr]">
        <aside className="flex flex-col rounded-xl border border-line bg-blush/60 p-3">
          <div className="mb-4 hidden items-center gap-2 border-b border-line pb-4 lg:flex">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-gold-light">
              A&P
            </span>
            <div>
              <p className="text-xs font-bold text-accent">Ashu & Priya</p>
              <p className="mt-1 text-[9px] text-muted">Our Ayodhya wedding</p>
            </div>
          </div>
          <nav
            aria-label="Sample workspace views"
            className="flex flex-wrap gap-1 lg:flex-col"
          >
            {tabs.map((tab) => (
              <button
                key={tab.name}
                type="button"
                aria-pressed={view === tab.name}
                onClick={() => setView(tab.name)}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-[11px] font-semibold transition ${view === tab.name ? "bg-accent text-white" : "text-muted hover:bg-line/60"}`}
              >
                <Icon name={tab.icon} className="size-3.5" />
                {tab.name}
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden pt-8 lg:block">
            <p className="mb-3 text-[9px] leading-4 text-muted">
              A shared space for the people who make your day.
            </p>
            <a
              href="#showcase"
              className="flex items-center justify-center gap-2 rounded-md border border-line bg-white px-2 py-2 text-[10px] font-semibold text-accent"
            >
              <Icon name="globe" className="size-3" /> Preview wedding website
            </a>
          </div>
        </aside>
        <div className="min-w-0 space-y-4 p-1 sm:p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: "Invitation replies",
                value: "98 / 120",
                note: "Invitation groups",
                icon: "mail",
              },
              {
                label: "Guests attending",
                value: "248",
                note: "Confirmed people",
                icon: "people",
              },
              {
                label: "Total expenses",
                value: "₹4.5L",
                note: "Recorded expenses",
                icon: "wallet",
              },
              {
                label: "Tasks completed",
                value: "18 / 24",
                note: "Every little thing counts",
                icon: "task",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-line bg-surface p-3"
              >
                <div className="flex justify-between gap-1 text-[9px] text-muted">
                  <span>{stat.label}</span>
                  <Icon
                    name={stat.icon as IconName}
                    className="size-3 text-accent"
                  />
                </div>
                <p className="my-2 font-serif text-xl font-semibold sm:text-2xl">
                  {stat.value}
                </p>
                <p className="text-[9px] text-muted">{stat.note}</p>
              </div>
            ))}
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="min-h-[350px] rounded-xl bg-blush/30 p-3 sm:p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-accent">
                  {view === "Overview"
                    ? "Every celebration, beautifully organised."
                    : view}
                </h3>
                <p className="mt-1 text-[10px] text-muted">
                  {view === "Overview" || view === "Events"
                    ? "15–17 December 2027 · Ayodhya"
                    : "Ashu & Priya’s sample wedding"}
                </p>
              </div>
              <span className="hidden rounded-full border border-line bg-white px-2 py-1 text-[9px] text-muted sm:block">
                Sample wedding
              </span>
            </div>
            {view === "Overview" ? (
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <EventList />
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                    Guest invitations
                  </p>
                  <GuestList />
                </div>
              </div>
            ) : view === "Events" ? (
              <EventList />
            ) : view === "Tasks" ? (
              <TaskList />
            ) : view === "Guests & RSVPs" ? (
              <GuestList />
            ) : (
              <ExpenseList />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
