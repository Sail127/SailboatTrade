// app/dashboard/page.js
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import SignOutButton from "./SignOutButton";
import { ListingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const NAVY = "#0a2230";
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

function StatusPill({ status }) {
  const isPublished = status === ListingStatus.PUBLISHED;

  const cls = isPublished
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-amber-200 bg-amber-50 text-amber-900";

  const label =
    status === ListingStatus.READY_FOR_CHECKOUT
      ? "Ready for checkout"
      : status === ListingStatus.PENDING_REVIEW
      ? "Pending review"
      : status === ListingStatus.PUBLISHED
      ? "Published"
      : status === ListingStatus.ARCHIVED
      ? "Archived"
      : status === ListingStatus.REJECTED
      ? "Rejected"
      : status === ListingStatus.REMOVED
      ? "Removed"
      : "Draft";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function ActionLink({ href, title, desc, right }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
    >
      <div>
        <div className="text-sm font-semibold text-[#0a2230]">{title}</div>
        {desc ? <div className="mt-1 text-sm text-slate-600">{desc}</div> : null}
      </div>

      {right ? (
        <div className="text-xs text-slate-500">{right}</div>
      ) : (
        <span className="text-slate-300 group-hover:text-slate-400 text-lg leading-none">›</span>
      )}
    </Link>
  );
}

export default async function DashboardHome() {
  const s = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true, // only used for initials fallback
      name: true,
      firstName: true,
      lastName: true,
      businessName: true,
    },
  });

  const listings = await prisma.listing.findMany({
    where: { ownerId: s.uid },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      year: true,
      builder: true,
      model: true,
      status: true,
      updatedAt: true,
    },
    take: 50,
  });

  const favoritesCount = await prisma.favorite.count({ where: { userId: s.uid } });

  const who = displayPerson(user);
  const company = displayCompany(user);
  const initials = initialsFromUser(user);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Banner */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
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

          {/* Actions */}
          <div className="mt-6 grid gap-3">
            <ActionLink
              href="/dashboard/favorites"
              title="Favorite Boats"
              desc="Boats you’ve saved."
              right={`${favoritesCount} saved`}
            />

            <ActionLink
              href="/dashboard/alerts"
              title="Email Alerts"
              desc="Manage alerts that match your saved search criteria."
            />

            {/* My Listings section */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0a2230]">My Listings</div>
                  <div className="mt-1 text-sm text-slate-600">
                    View and manage your listings and their current status.
                  </div>
                </div>

                <Link
                  href="/listings/new"
                  className="h-9 inline-flex items-center rounded-full px-4 text-sm font-semibold text-[#0a2230] hover:brightness-95"
                  style={{ background: GOLD }}
                >
                  Create listing
                </Link>
              </div>

              {listings.length === 0 ? (
                <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  You don’t have any listings yet.
                </div>
              ) : (
                <div className="mt-4 divide-y">
                  {listings.map((l) => {
                    const titleBits = [
                      l.year ? String(l.year) : null,
                      l.builder || null,
                      l.model || null,
                      l.title || null,
                    ].filter(Boolean);

                    const label = titleBits.join(" ").trim() || "Untitled listing";

                    return (
                      <Link
                        key={l.id}
                        href="/dashboard/listings"
                        className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition"
                        title="Open My Listings"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#0a2230] truncate">{label}</div>
                        </div>
                        <div className="shrink-0">
                          <StatusPill status={l.status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <Link
                  href="/dashboard/listings"
                  className="text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                >
                  View all listings →
                </Link>
              </div>
            </div>

            <ActionLink
              href="/dashboard/account"
              title="Account"
              desc="Profile, email verification, and account options."
            />

            <div className="rounded-2xl border bg-white px-5 py-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#0a2230]">Sign out</div>
                <div className="mt-1 text-sm text-slate-600">End your session on this device.</div>
              </div>

              <SignOutButton className="h-10 rounded-full border px-5 text-sm font-semibold text-[#0a2230] hover:bg-slate-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
