"use client";

export default function Error({ error, reset }) {
  return (
    <main className="mx-auto max-w-4xl px-5 md:px-8 py-10">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h1 className="text-lg font-semibold text-red-800">
          New Listing page crashed
        </h1>

        <p className="mt-2 text-[13px] text-red-800/90">
          The form threw an error while rendering. The message is below.
        </p>

        <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-red-200 bg-white p-3 text-[12px] text-slate-900">
          {String(error?.message || error)}
          {"\n\n"}
          {String(error?.stack || "")}
        </pre>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold bg-[#0a2230] text-white hover:bg-[#0f2a3b]"
            type="button"
          >
            Try again
          </button>

          <a
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold border border-slate-300 bg-white text-[#0a2230] hover:bg-slate-50"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
