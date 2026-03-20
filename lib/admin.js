// lib/admin.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasMinRole } from "@/lib/rbac";

export async function requireAdminApi(minRole = "MODERATOR") {
  const s = await requireUser().catch(() => null); // avoid throwing 500s
  if (!s?.uid) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const me = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { id: true, email: true, role: true, isDisabled: true, deletedAt: true },
  });

  if (!me || me.deletedAt || me.isDisabled) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!hasMinRole(me.role, minRole)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, me };
}

export async function audit({ actorId, action, entityType, entityId, reason, meta }) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        reason: reason || null,
        meta: meta || undefined,
      },
    });
  } catch {
    // audit should never break the primary action
  }
}

export async function deleteUserCompletely(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new Error("Missing user id.");
  }

  const user = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: { id: true },
  });

  if (!user) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const listingIds = await prisma.listing.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });
  const ids = listingIds.map((x) => x.id);

  await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { userId: user.id } }),
    ...(ids.length
      ? [prisma.favorite.deleteMany({ where: { listingId: { in: ids } } })]
      : []),
    prisma.listing.deleteMany({ where: { ownerId: user.id } }),
    prisma.adminAuditLog.deleteMany({ where: { actorId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return { ok: true, deletedUserId: user.id, deletedListingCount: ids.length };
}
