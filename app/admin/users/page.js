import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import AdminUsersTable from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }) {
  const gate = await requireAdminApi("ADMIN");
  if (!gate.ok) throw new Error(gate.error);

  const q = (searchParams?.q || "").toString().trim();

  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, email: true, name: true, role: true, isDisabled: true, deletedAt: true, createdAt: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="text-2xl font-semibold text-[#0a2230]">Users</h1>

      <form className="mt-4" action="/admin/users" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email or name…"
          className="w-full max-w-xl rounded-xl border px-4 py-2 text-sm"
        />
      </form>

      <div className="mt-6">
        <AdminUsersTable initialUsers={users} />
      </div>
    </div>
  );
}
