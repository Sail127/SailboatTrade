"use client";

import { useMemo, useState } from "react";

function groupedPreviews(previews) {
  const groups = new Map();
  for (const item of previews || []) {
    const key = item.group || "Other";
    const bucket = groups.get(key) || [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries());
}

function SendTestButton({ item, recipient, onRecipientChange }) {
  const [status, setStatus] = useState({ kind: "idle", message: "" });
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    setStatus({ kind: "idle", message: "" });
    try {
      const res = await fetch("/api/admin/email-previews/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: item.key, to: recipient }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not send test email.");
      }

      setStatus({ kind: "success", message: `Sent to ${data.sentTo}` });
    } catch (error) {
      setStatus({ kind: "error", message: error?.message || "Could not send test email." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <label className="block text-[12px] font-extrabold tracking-[0.16em] text-slate-500">
        TEST SEND
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
          className="h-10 min-w-[260px] flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
          placeholder="admin@example.com"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-sm font-semibold text-white transition hover:bg-[#15384d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send Test"}
        </button>
      </div>
      {status.message ? (
        <div
          className={`mt-2 text-sm ${
            status.kind === "error" ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}

function PreviewCard({ item, defaultRecipient }) {
  const [recipient, setRecipient] = useState(item.previewTo || defaultRecipient || "");

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(2,6,23,0.06)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-5">
        <div className="text-[11px] font-extrabold tracking-[0.18em] text-[#8a6a12]">
          {item.group}
        </div>
        <h2 className="mt-2 text-xl font-extrabold text-[#0a2230]">{item.label}</h2>
        <p className="mt-2 text-sm text-slate-600">{item.description}</p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">SUBJECT</div>
            <div className="mt-2 text-sm font-semibold text-[#0a2230]">{item.subject}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">TEXT FALLBACK</div>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
              {item.text}
            </pre>
          </div>

          <SendTestButton
            item={item}
            recipient={recipient}
            onRecipientChange={setRecipient}
          />
        </div>

        <div className="rounded-[28px] border border-[#d8e1e7] bg-[#eef3f6] p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">HTML PREVIEW</div>
            <div className="text-xs text-slate-500">Live branded layout</div>
          </div>
          <iframe
            title={`${item.label} preview`}
            srcDoc={item.html}
            className="h-[980px] w-full rounded-[22px] border border-slate-200 bg-white"
          />
        </div>
      </div>
    </article>
  );
}

export default function AdminEmailPreviewsClient({ initialPreviews, defaultRecipient }) {
  const groups = useMemo(() => groupedPreviews(initialPreviews), [initialPreviews]);

  return (
    <div className="space-y-8">
      {groups.map(([group, items]) => (
        <section key={group}>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">COLLECTION</div>
              <h2 className="mt-1 text-2xl font-extrabold text-[#0a2230]">{group}</h2>
            </div>
            <div className="text-sm text-slate-500">{items.length} templates</div>
          </div>

          <div className="space-y-6">
            {items.map((item) => (
              <PreviewCard
                key={item.key}
                item={item}
                defaultRecipient={defaultRecipient}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
