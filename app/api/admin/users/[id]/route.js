import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { audit, deleteUserCompletely, requireAdminApi } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["USER", "MODERATOR", "ADMIN"]);

function normalizeRole(value) {
  const role = String(value || "").trim().toUpperCase();
  return ALLOWED_ROLES.has(role) ? role : null;
}

async function adminCount() {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      deletedAt: null,
      isDisabled: false,
    },
  });
}

export async function DELETE(_req, { params }) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  if (id === guard.me.id) {
    return NextResponse.json(
      { ok: false, error: "Use the account delete flow to delete your own account." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      _count: {
        select: {
          listings: true,
          favorites: true,
          auditLogs: true,
        },
      },
    },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  if (target.role === "ADMIN") {
    const count = await adminCount();
    if (count <= 1) {
      return NextResponse.json(
        { ok: false, error: "You cannot delete the last remaining admin account." },
        { status: 400 }
      );
    }
  }

  const deleted = await deleteUserCompletely(target.id);
  if (!deleted.ok) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  await audit({
    actorId: guard.me.id,
    action: "ADMIN_USER_DELETE",
    entityType: "User",
    entityId: target.id,
    reason: null,
    meta: {
      email: target.email,
      role: target.role,
      listingsCount: target._count?.listings || 0,
      favoritesCount: target._count?.favorites || 0,
      auditLogsCount: target._count?.auditLogs || 0,
    },
  });

  return NextResponse.json({
    ok: true,
    deletedUserId: target.id,
    deletedEmail: target.email,
  });
}

export async function PATCH(req, { params }) {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status || 403 });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  if (id === guard.me.id) {
    return NextResponse.json(
      { ok: false, error: "You cannot change your own admin role from this screen." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const nextRole = normalizeRole(body?.role);
  if (!nextRole) {
    return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  if (target.role === "ADMIN" && nextRole !== "ADMIN") {
    const count = await adminCount();
    if (count <= 1) {
      return NextResponse.json(
        { ok: false, error: "You cannot demote the last remaining admin account." },
        { status: 400 }
      );
    }
  }

  if (target.role === nextRole) {
    return NextResponse.json({
      ok: true,
      user: {
        id: target.id,
        email: target.email,
        role: target.role,
      },
    });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: nextRole },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  await audit({
    actorId: guard.me.id,
    action: "ADMIN_USER_ROLE_UPDATE",
    entityType: "User",
    entityId: updated.id,
    reason: null,
    meta: {
      email: updated.email,
      previousRole: target.role,
      nextRole,
    },
  });

  return NextResponse.json({
    ok: true,
    user: updated,
  });
}
