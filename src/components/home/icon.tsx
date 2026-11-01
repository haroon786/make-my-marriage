const paths = {
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 .1a4 4 0 0 1 0 7.8",
  check: "m5 12 4 4L19 6",
  wallet:
    "M20 8V5H5a2 2 0 0 1 0-4h14v4M3 3v16a2 2 0 0 0 2 2h16V8H5a2 2 0 0 1-2-2m14 8h4",
  image: "M3 3h18v18H3Zm0 14 6-6 4 4 3-3 5 5M15 7h.01",
  mail: "M3 5h18v14H3Zm0 0 9 7 9-7",
  lock: "M5 11h14v10H5Zm3 0V7a4 4 0 0 1 8 0v4m-4 4v2",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18Z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  task: "M9 5h12M9 12h12M9 19h12M2 4l2 2 3-3M2 11l2 2 3-3M2 18l2 2 3-3",
  play: "m9 6 9 6-9 6V6Z",
  flower:
    "M12 12c-7-2-7-9-3-9 3 0 3 6 3 9Zm0 0c2-7 9-7 9-3 0 3-6 3-9 3Zm0 0c7 2 7 9 3 9-3 0-3-6-3-9Zm0 0c-2 7-9 7-9 3 0-3 6-3 9-3Z",
  grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
  store: "m3 3-1 7h20l-1-7H3Zm1 7v11h16V10M9 21v-7h6v7",
  close: "m6 6 12 12M6 18 18 6",
  menu: "M4 6h16M4 12h16M4 18h16",
} as const;

export type IconName = keyof typeof paths;
export function Icon({
  name,
  className = "size-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      width="20"
      height="20"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d={paths[name]} />
    </svg>
  );
}
