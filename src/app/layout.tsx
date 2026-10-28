import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Make My Marriage", template: "%s | Make My Marriage" },
  description: "A shared space to plan, celebrate, and remember your wedding.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
