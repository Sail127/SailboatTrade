"use client";

export default function DashboardError({ error, reset }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-bold text-[#0a2230]">Dashboard error</h1>
      <p className="mt-2 text-sm text-slate-600">
        Something on the client crashed while loading the dashboard.
      </p>

      <pre className="mt-4 whitespace-pre-wrap rounded-xl border bg-white p-4 text-xs text-red-700">
        {String(error?.message || error)}
      </pre>

      <button
        onClick={() => reset()}
        className="mt-4 h-10 rounded-xl bg-[#c8a44d] px-4 font-semibold text-[#0a2230]"
      >
        Try again
      </button>
    </div>
  );
}
