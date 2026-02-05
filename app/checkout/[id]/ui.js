"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutUI({ listing }) {
  const router = useRouter();
  const [err, setErr] = useState("");

  async function simulatePay() {
    setErr("");
    const res = await fetch(`/api/listings/${listing.id}/mark-paid`, { method: "POST" });
    const data = await res.json();
    if (!data.ok) return setErr(data.error || "Payment failed.");
    router.push(`/listings/preview/${data.previewToken}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Checkout (Stub)</h1>
      <p className="mt-2 text-gray-600">
        This is a placeholder for Stripe checkout. Click below to simulate a successful payment.
      </p>

      {err && <div className="text-sm text-red-600 mt-4">{err}</div>}

      <button className="mt-6 rounded-md bg-[#c8a44d] px-4 py-2 font-medium" onClick={simulatePay}>
        Simulate payment success
      </button>
    </div>
  );
}
