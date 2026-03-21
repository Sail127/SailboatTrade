// app/dashboard/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
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
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      {right ? <span className="text-xs text-slate-500">{right}</span> : <span className="text-slate-300 text-lg leading-none">›</span>}
    </Link>
  );
}

function SectionCard({ eyebrow, title, description, tone = "default", children }) {
  const isAdminTone = tone === "admin";
  return (
    <section
      className={
        isAdminTone
          ? "rounded-3xl border border-[#e6d49a] bg-[linear-gradient(180deg,#fffdf7_0%,#fff7df_100%)] p-5 shadow-[0_16px_32px_rgba(2,6,23,0.07)]"
          : "rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_26px_rgba(2,6,23,0.06)]"
      }
    >
      <div>
        <div className={`text-[12px] font-extrabold tracking-[0.18em] ${isAdminTone ? "text-[#8a6a12]" : "text-slate-500"}`}>
          {eyebrow}
        </div>
        <h2 className={`mt-2 text-xl font-extrabold ${isAdminTone ? "text-[#0a2230]" : "text-[#0a2230]"}`}>{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function DashboardHome() {
  const s = await requireUser().catch(() => null);
  if (!s?.uid) redirect(`/login?next=${encodeURIComponent("/dashboard")}`);

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      businessName: true,
      role: true, // ✅ needed for admin link(s)
    },
  });

  if (!user) redirect(`/login?next=${encodeURIComponent("/dashboard")}`);

  const favoritesCount = await prisma.favorite.count({
    where: { userId: s.uid },
  });

  const who = displayPerson(user);
  const company = displayCompany(user);
  const initials = initialsFromUser(user);

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  const isAdmin = user.role === "ADMIN";
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, newUsersLast7Days, totalActiveListings] = isAdmin
    ? await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.listing.count({
          where: { status: "PUBLISHED" },
        }),
      ])
    : [0, 0, 0];

  return (
    <div className="bg-white">
      <div className="mx-auto px-4 py-10 flex justify-center">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="flex items-start gap-4 justify-center">
            <div
              className="h-12 w-12 rounded-full grid place-items-center text-sm font-extrabold text-[#0a2230] shrink-0"
              style={{ background: GOLD }}
              title={who}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[#0a2230]">User Dashboard</h1>
              <div className="mt-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{who}</span>
                {company ? (
                  <>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="font-semibold text-slate-900">{company}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <SectionCard
              eyebrow="MEMBER TOOLS"
              title="Your Account"
              description="Manage listings, favorites, and the personal details tied to your account."
            >
              <SimpleLink href="/dashboard/listings" label="My Listings" />
              <SimpleLink href="/listings/new" label="Create listing" />
              <SimpleLink href="/dashboard/favorites" label="Favorite Boats" right={`${favoritesCount} saved`} />
              <SimpleLink href="/dashboard/alerts" label="Email Alerts" />
              <SimpleLink href="/dashboard/account" label="Account" />
            </SectionCard>

            {isStaff ? (
              <SectionCard
                eyebrow="ADMIN CONTROLS"
                title="Staff Access"
                description="Moderation and back-office tools are separated here so they’re easy to find and harder to confuse with standard user actions."
                tone="admin"
              >
                <SimpleLink href="/dashboard/admin/review" label="Admin Review Queue" />
                {isAdmin ? (
                  <SimpleLink
                    href="/dashboard/admin/active-listings"
                    label="Active Listings"
                    right={`${totalActiveListings} live`}
                  />
                ) : null}
                {isAdmin ? <SimpleLink href="/dashboard/admin/storage" label="Storage Cleanup / Site Inactive Listings" right="Drafts and storage" /> : null}
                {isAdmin ? (
                  <SimpleLink
                    href="/dashboard/admin/users"
                    label="User Management"
                    right={`${totalUsers} total • ${newUsersLast7Days} new in 7d`}
                  />
                ) : null}
                {isAdmin ? <SimpleLink href="/dashboard/admin/email-health" label="Email Health" right="Deliverability" /> : null}
                {isAdmin ? <SimpleLink href="/dashboard/admin/email-previews" label="Email Previews" right="Transactional mail" /> : null}
              </SectionCard>
            ) : null}
          </div>

          {/* Sign out */}
          <div className="mt-10 border-t border-slate-200 pt-6 flex justify-end">
            <SignOutButton className="h-10 rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
