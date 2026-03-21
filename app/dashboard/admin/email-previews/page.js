import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { getEmailPreviewCatalog } from "@/lib/email/templates";
import AdminEmailPreviewsClient from "./ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminEmailPreviewsPage() {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) redirect("/dashboard");

  const me = await prisma.user.findUnique({
    where: { id: guard.me.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      name: true,
    },
  });

  const currentAdminName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim() || me?.name || guard.me.email;

  const previews = getEmailPreviewCatalog({
    appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000",
    currentAdminEmail: guard.me.email,
    currentAdminName,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5 rounded-3xl border border-[#e6d49a] bg-[linear-gradient(180deg,#fffdf7_0%,#fff7df_100%)] p-5 shadow-[0_16px_32px_rgba(2,6,23,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-extrabold tracking-[0.18em] text-[#8a6a12]">ADMIN EMAIL STUDIO</div>
            <h1 className="mt-2 text-2xl font-extrabold text-[#0a2230]">Transactional Email Previews</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review the exact branded email layouts users receive, inspect subject lines and text fallbacks, and send test copies to yourself before you publish changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/email-health"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
            >
              Email Health
            </Link>
            <Link
              href="/dashboard/admin/users"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
            >
              User Management
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <AdminEmailPreviewsClient
        initialPreviews={previews}
        defaultRecipient={guard.me.email}
      />
    </div>
  );
}
