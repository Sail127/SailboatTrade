// app/listings/new/page.js
import NewListingForm from "./NewListingForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post a Sailboat Listing | SailboatTrade.com",
  description: "Create a sailboat listing on SailboatTrade.com.",
};

export default function NewListingPage() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-4xl px-5 md:px-8 pt-10 md:pt-12 pb-14">
        <h1 className="text-3xl md:text-4xl font-semibold text-[#0a2230]">
          Post a Sailboat listing
        </h1>
        <p className="mt-3 text-slate-600">
          Create your listing in a few minutes. You can publish now or save as a draft.
        </p>

        <div className="mt-8">
          <NewListingForm />
        </div>
      </section>
    </main>
  );
}
