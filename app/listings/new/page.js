// app/listings/new/page.js
import { redirect } from "next/navigation";
import NewListingForm from "./NewListingForm";
import { readSession } from "@/lib/auth"; // adjust if your file is named differently

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
    redirect(`/login?next=${encodeURIComponent("/dashboard/listings")}`);
  }

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-4xl px-5 md:px-8 pt-10 md:pt-12 pb-14">
        <h1 className="text-3xl md:text-4xl font-semibold text-[#0a2230]">
        Post a Sailboat listing
        </h1>
       
        <div className="mt-8">
          <NewListingForm />
        </div>
      </section>
    </main>
  );
}
