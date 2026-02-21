// app/dashboard/admin/review/page.js
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import AdminReviewClient from "./ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromListing(l) {
  const year = l?.year != null ? String(l.year) : "";
  const builder = String(l?.builder || "").trim();
  const model = String(l?.model || "").trim();
  const fallback = String(l?.title || "Listing").trim();
  return [year, builder, model].filter(Boolean).join(" ") || fallback;
}

export default async function AdminReviewPage() {
  const guard = await requireAdminApi("MODERATOR");
  if (!guard.ok) redirect("/dashboard");

  const items = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW", paymentStatus: "PAID" },
    orderBy: { submittedForReviewAt: "desc" },
    take: 50,
    select: {
      id: true,
      ownerId: true,
      title: true,
      year: true,
      builder: true,
      model: true,
      plan: true,
      previewToken: true,
      submittedForReviewAt: true,
      paidAt: true,
    },
  });

  const ownerIds = Array.from(new Set(items.map((x) => x.ownerId).filter(Boolean)));
  const users = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const initialItems = items.map((l) => {
    const u = userById.get(l.ownerId) || null;
    return {
      id: l.id,
      title: titleFromListing(l),
      plan: l.plan,
      ownerEmail: u?.email || null,
      ownerName: u?.name || null,
      previewToken: l.previewToken || null,
      submittedForReviewAt: l.submittedForReviewAt ? new Date(l.submittedForReviewAt).toISOString() : null,
      paidAt: l.paidAt ? new Date(l.paidAt).toISOString() : null,
    };
  });

  return <AdminReviewClient initialItems={initialItems} />;
}
