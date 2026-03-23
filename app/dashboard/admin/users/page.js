import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import AdminUsersClient from "./ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }) {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      name: true,
      businessName: true,
      role: true,
      emailVerifiedAt: true,
      emailVerificationSentAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          listings: true,
          favorites: true,
          auditLogs: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const initialUsers = users.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    businessName: user.businessName,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailVerifiedAt: user.emailVerifiedAt,
    emailVerificationSentAt: user.emailVerificationSentAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    listingsCount: user._count?.listings || 0,
    favoritesCount: user._count?.favorites || 0,
    auditLogsCount: user._count?.auditLogs || 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <div className="text-[12px] font-extrabold tracking-wide text-slate-500">ADMIN</div>
          <h1 className="mt-1 text-2xl font-semibold text-[#0a2230]">Site Users</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage user accounts directly from the dashboard.
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Link
            href="/dashboard/admin/active-listings"
            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50 sm:w-auto"
          >
            All Listings
          </Link>
          <Link
            href="/dashboard/admin/email-health"
            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50 sm:w-auto"
          >
            Email Health
          </Link>
          <Link
            href="/dashboard/admin/email-previews"
            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50 sm:w-auto"
          >
            Email Previews
          </Link>
          <Link
            href="/dashboard/admin/review"
            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50 sm:w-auto"
          >
            Review Queue
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b] sm:w-auto"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <AdminUsersClient
        initialUsers={initialUsers}
        currentAdminId={guard.me.id}
        canManageUserAccess={guard.me.role === "ADMIN"}
        initialQuery={String(searchParams?.userId || searchParams?.q || "")}
        initialExpandedUserId={String(searchParams?.userId || "")}
      />
    </div>
  );
}
