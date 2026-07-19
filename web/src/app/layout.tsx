import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meeting Copilot",
  description: "Company-aware answers during your meetings",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
        <nav className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold">
              Meeting Copilot
            </Link>
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
              Meetings
            </Link>
            <Link href="/knowledge" className="text-sm text-zinc-600 hover:text-zinc-900">
              Knowledge
            </Link>
            {user ? (
              <UserMenu name={user.name} />
            ) : (
              <Link href="/login" className="ml-auto text-sm text-zinc-600 hover:text-zinc-900">
                Sign in
              </Link>
            )}
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
