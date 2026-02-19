// app/dashboard/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

const GOLD = "#c8a44d";

function displayPerson(user) {
  const fn = (user?.firstName || "").trim();
  const ln = (user?.lastName || "").trim();
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  return (user?.name || "").trim() || "User";
}

function displayCompany(user) {
  const c = (user?.businessName || "").trim();
  return c || "";
}

function initialsFromUser(user) {
  const fn = (user?.firstName || "").trim();
  const ln = (user?.lastName || "").trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();

  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  const email = (user?.email || "").trim();
  if (email) return (email.split("@")[0] || "U").slice(0, 2).toUpperCase();
  return "U";
}

function SimpleLink({ href, label, right }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-3 border-b border-slate-200 hover:bg-slate-50 px-2 -mx-2 rounded-lg transition"
    >
      <span className="text-sm font-semibold text-[#0a2230]">{label}</span>
      {right ? (
        <span className="text-xs text-slate-500">{right}</span>
      ) : (
        <span className="text-slate-300 text-lg leading-none">›</span>
      )}
    </Link>
  );
}

export default async function DashboardHome() {
  let s;
  try {
    try {
      try {
        s = await requireUser();
      } catch {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      businessName: true,
    },
  });

  const favoritesCount = await prisma.favorite.count({
    where: { userId: s.uid },
  });

  const who = displayPerson(user);
  const company = displayCompany(user);
  const initials = initialsFromUser(user);

  return (
    <div className="bg-white">
      <div className="mx-auto px-4 py-10 flex justify-center">
        {/* Centered, narrower container */}
        <div className="w-full max-w-xl">
          {/* Header (centered) */}
          <div className="flex items-start gap-4 justify-center">
            <div
              className="h-12 w-12 rounded-full grid place-items-center text-sm font-extrabold text-[#0a2230] shrink-0"
              style={{ background: GOLD }}
              title={who}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[#0a2230]">
                User Dashboard
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{who}</span>
                {company ? (
                  <>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="font-semibold text-slate-900">
                      {company}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Links (left-justified inside centered container) */}
          <div className="mt-8">
            <SimpleLink href="/dashboard/listings" label="My Listings" />
            <SimpleLink href="/listings/new" label="Create listing" />
            <SimpleLink
              href="/dashboard/favorites"
              label="Favorite Boats"
              right={`${favoritesCount} saved`}
            />
            <SimpleLink href="/dashboard/alerts" label="Email Alerts" />
            <SimpleLink href="/dashboard/account" label="Account" />
          </div>

          {/* Sign out: button only, centered container, left-aligned row */}
          <div className="mt-10 border-t border-slate-200 pt-6 flex justify-end">
            <SignOutButton className="h-10 rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
