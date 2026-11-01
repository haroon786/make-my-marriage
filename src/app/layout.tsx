import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: [
    { path: "./fonts/manrope-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/manrope-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/manrope-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/manrope-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-manrope",
  display: "swap",
});
const playfair = localFont({
  src: [
    { path: "./fonts/playfair-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/playfair-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/playfair-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/playfair-500-italic.ttf", weight: "500", style: "italic" },
    { path: "./fonts/playfair-600-italic.ttf", weight: "600", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Make My Marriage", template: "%s | Make My Marriage" },
  description:
    "One shared wedding workspace for your family. Plan events and tasks, manage invitations and RSVPs, track expenses, and share your celebration.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
