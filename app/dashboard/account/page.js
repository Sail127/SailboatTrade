// app/dashboard/account/page.js
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import AccountUI from "./ui";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const s = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      createdAt: true,

      // ✅ Phase 1
      emailVerifiedAt: true,
      emailVerificationSentAt: true,
      deletedAt: true,
      isDisabled: true,
    },
  });

  return <AccountUI user={user} />;
}
