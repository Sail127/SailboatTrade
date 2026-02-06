import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi, audit } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  const gate = await requireAdminApi("ADMIN");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { me } = gate;
  const id = params.id;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").toUpperCase();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updatedUser = null;

  if (action === "DISABLE") {
    updatedUser = await prisma.user.update({
      where: { id },
      data: { isDisabled: true, disabledAt: new Date() },
      select: { id: true, email: true, role: true, isDisabled: true },
    });
  } else if (action === "ENABLE") {
    updatedUser = await prisma.user.update({
      where: { id },
      data: { isDisabled: false, disabledAt: null },
      select: { id: true, email: true, role: true, isDisabled: true },
    });
  } else if (action === "SET_ROLE") {
    const role = String(body.role || "").toUpperCase();
    if (!["USER", "MODERATOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true, isDisabled: true },
    });
  } else if (action === "DELETE_SOFT") {
    // Soft-delete: anonymize + disable + remove their listings from public
    await prisma.listing.updateMany({
      where: { ownerId: id, status: { not: "REMOVED" } },
      data: { status: "REMOVED", removedAt: new Date(), removedById: me.id, removedReason: "Owner account deleted." },
    });

    updatedUser = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDisabled: true,
        disabledAt: new Date(),
        email: `deleted_${id}@sailboattrade.invalid`,
        name: null,
        passwordHash: "deleted",
      },
      select: { id: true, email: true, role: true, isDisabled: true, deletedAt: true },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await audit({
    actorId: me.id,
    action,
    entityType: "User",
    entityId: id,
  });

  return NextResponse.json({ ok: true, user: updatedUser });
}
