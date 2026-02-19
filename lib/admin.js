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
