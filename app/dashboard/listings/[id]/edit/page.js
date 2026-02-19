import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import EditListingForm from "./ui";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }) {
  let s;
  try {
    try {
      try {
        try {
          s = await requireUser();
        } catch {
          return NextResponse.json(
            { ok: false, error: "Authentication required" },
            { status: 401 },
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 },
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
  } catch {
    return Response.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id: params.id, ownerId: s.uid },
  });

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          Listing not found.
        </div>
      </div>
    );
  }

  return <EditListingForm listing={listing} />;
}
