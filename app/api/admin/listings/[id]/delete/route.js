import { NextResponse } from "next/server";
import { audit, requireAdminApi } from "@/lib/admin";
import { deleteListingCompletely } from "@/lib/adminListings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing listing id." }, { status: 400 });
  }

  try {
    const result = await deleteListingCompletely(id);
    if (!result?.ok && result?.code === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }

    await audit({
      actorId: guard.me.id,
      action: "LISTING_HARD_DELETE",
      entityType: "Listing",
      entityId: id,
      reason: null,
      meta: {
        ownerId: result?.listing?.ownerId || null,
        previousStatus: result?.listing?.status || null,
        title: result?.listing?.title || null,
        deletedFavorites: result?.deletedFavorites || 0,
        deletedAuditLogs: result?.deletedAuditLogs || 0,
        deletedAssets: result?.deletedAssets || 0,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedListingId: id,
      deletedTitle: result?.listing?.title || null,
    });
  } catch (err) {
    console.error("DELETE /api/admin/listings/[id]/delete error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not delete listing." },
      { status: 500 }
    );
  }
}
