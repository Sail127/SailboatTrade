// app/listings/new/page.js
import Link from "next/link";
import { redirect } from "next/navigation";
import NewListingForm from "./NewListingForm";
import ResendVerifyButton from "@/app/dashboard/ResendVerifyButton";
import { readSession } from "@/lib/auth"; // adjust if your file is named differently
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post a Sailboat Listing | SailboatTrade.com",
  description: "Create a sailboat listing on SailboatTrade.com.",
};

export default async function NewListingPage() {
  const s = await readSession();

  // ✅ not logged in → bounce to login, then return here
  if (!s?.uid) {
    redirect(`/login?next=${encodeURIComponent("/listings/new")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: {
      emailVerifiedAt: true,
      firstName: true,
      name: true,
    },
  });

  const isVerified = Boolean(user?.emailVerifiedAt);
  const firstName = String(user?.firstName || user?.name || "").trim();

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-4xl px-5 md:px-8 pt-10 md:pt-12 pb-14">
        <h1 className="text-3xl md:text-4xl font-semibold text-[#0a2230]">
          Post a Sailboat listing
        </h1>

        {!isVerified ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-[0_16px_40px_rgba(127,29,29,0.08)]">
            <div className="text-[12px] font-extrabold tracking-[0.18em] text-red-700">VERIFICATION REQUIRED</div>
            <h2 className="mt-2 text-2xl font-extrabold text-red-900">
              {firstName ? `${firstName}, verify your email before posting a listing.` : "Verify your email before posting a listing."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-red-900/85">
              You cannot enter listing details until your email address is verified. Check your inbox for the welcome email, then use the verification link to unlock full site functionality.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-red-900/85">
              If you still need a fresh verification email, send one below.
            </p>

            <div className="mt-5">
              <ResendVerifyButton />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard/account"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-sm font-semibold text-white hover:bg-[#0f2a3b]"
              >
                Go to Account
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-800 hover:bg-red-100"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <NewListingForm />
          </div>
        )}
      </section>
    </main>
  );
}
