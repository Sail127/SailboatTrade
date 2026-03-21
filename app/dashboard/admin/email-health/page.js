import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminApi } from "@/lib/admin";
import { getEmailHealthSnapshot } from "@/lib/emailHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(value) {
  try {
    return value ? new Date(value).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

function statusTone(ok) {
  return ok
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-red-200 bg-red-50 text-red-900";
}

function eventTone(event) {
  const normalized = String(event || "").toLowerCase();
  if (normalized === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (normalized === "bounced" || normalized === "complained" || normalized === "failed") {
    return "border-red-200 bg-red-50 text-red-900";
  }
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function recordOk(records, matcher) {
  return records.some((record) => matcher(record) && String(record.status || "").toLowerCase() === "verified");
}

export default async function AdminEmailHealthPage() {
  const guard = await requireAdminApi("ADMIN");
  if (!guard.ok) redirect("/dashboard");

  const snapshot = await getEmailHealthSnapshot().catch(() => null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5 rounded-3xl border border-[#e6d49a] bg-[linear-gradient(180deg,#fffdf7_0%,#fff7df_100%)] p-5 shadow-[0_16px_32px_rgba(2,6,23,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-extrabold tracking-[0.18em] text-[#8a6a12]">EMAIL HEALTH</div>
            <h1 className="mt-2 text-2xl font-extrabold text-[#0a2230]">Delivery Monitoring</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Monitor sender authentication, recent delivery outcomes, and the weekly actions that keep SailboatTrade emails out of spam folders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/email-previews"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
            >
              Email Previews
            </Link>
            <Link
              href="/dashboard/admin/users"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-[13px] font-semibold text-[#0a2230] hover:bg-slate-50"
            >
              User Management
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#0a2230] px-5 text-[13px] font-semibold text-white hover:bg-[#0f2a3b]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {!snapshot ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          Could not load live email health data right now. Check `RESEND_API_KEY` and try refreshing the page.
        </div>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_26px_rgba(2,6,23,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">LIVE STATUS</div>
                <h2 className="mt-2 text-xl font-extrabold text-[#0a2230]">Sender Authentication</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Live checks from Resend and DNS for the current transactional sender.
                </p>
              </div>
              <div className="text-sm text-slate-500">Updated {fmtDate(snapshot.generatedAt)}</div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className={`rounded-2xl border px-4 py-4 ${statusTone(Boolean(snapshot.domain && snapshot.domain.status === "verified"))}`}>
                <div className="text-[11px] font-extrabold tracking-[0.14em]">DOMAIN</div>
                <div className="mt-2 text-base font-bold">{snapshot.sendingDomain || "Not configured"}</div>
                <div className="mt-1 text-sm">Resend status: {snapshot.domain?.status || "Missing"}</div>
              </div>

              <div className={`rounded-2xl border px-4 py-4 ${statusTone(recordOk(snapshot.domain?.records || [], (record) => record.record === "DKIM"))}`}>
                <div className="text-[11px] font-extrabold tracking-[0.14em]">DKIM</div>
                <div className="mt-2 text-base font-bold">resend._domainkey</div>
                <div className="mt-1 text-sm">Resend verification: {recordOk(snapshot.domain?.records || [], (record) => record.record === "DKIM") ? "Verified" : "Needs attention"}</div>
              </div>

              <div className={`rounded-2xl border px-4 py-4 ${statusTone(recordOk(snapshot.domain?.records || [], (record) => record.type === "MX"))}`}>
                <div className="text-[11px] font-extrabold tracking-[0.14em]">RETURN-PATH MX</div>
                <div className="mt-2 text-base font-bold">send.{snapshot.sendingDomain || "your-domain"}</div>
                <div className="mt-1 text-sm">Resend verification: {recordOk(snapshot.domain?.records || [], (record) => record.type === "MX") ? "Verified" : "Needs attention"}</div>
              </div>

              <div className={`rounded-2xl border px-4 py-4 ${statusTone(recordOk(snapshot.domain?.records || [], (record) => record.type === "TXT" && record.record === "SPF"))}`}>
                <div className="text-[11px] font-extrabold tracking-[0.14em]">RETURN-PATH SPF</div>
                <div className="mt-2 text-base font-bold">send.{snapshot.sendingDomain || "your-domain"}</div>
                <div className="mt-1 text-sm">Resend verification: {recordOk(snapshot.domain?.records || [], (record) => record.type === "TXT" && record.record === "SPF") ? "Verified" : "Needs attention"}</div>
              </div>

              <div className={`rounded-2xl border px-4 py-4 ${statusTone(snapshot.dmarc?.ok)}`}>
                <div className="text-[11px] font-extrabold tracking-[0.14em]">DMARC</div>
                <div className="mt-2 text-base font-bold">{snapshot.dmarc?.host || "Missing"}</div>
                <div className="mt-1 text-sm break-all">{snapshot.dmarc?.value || "No DMARC record found."}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800">
                <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">GOOGLE POSTMASTER</div>
                <div className="mt-2 text-base font-bold text-[#0a2230]">{snapshot.rootDomain || "sailboattrade.com"}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Use the root domain in Google Postmaster Tools. This is an operational step and is not auto-verifiable here.
                </div>
                <a
                  href="https://postmaster.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-[#0a2230] underline underline-offset-2"
                >
                  Open Google Postmaster Tools
                </a>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_26px_rgba(2,6,23,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">RECENT OUTCOMES</div>
                  <h2 className="mt-2 text-xl font-extrabold text-[#0a2230]">Provider Delivery Snapshot</h2>
                </div>
                <div className="text-sm text-slate-500">Latest 100 messages from Resend</div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">TOTAL</div>
                  <div className="mt-2 text-3xl font-extrabold text-[#0a2230]">{snapshot.summary.total}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold tracking-[0.14em] text-emerald-700">DELIVERED</div>
                  <div className="mt-2 text-3xl font-extrabold text-emerald-900">{snapshot.summary.delivered}</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold tracking-[0.14em] text-amber-700">NEEDS REVIEW</div>
                  <div className="mt-2 text-3xl font-extrabold text-amber-900">{snapshot.summary.nonDelivered}</div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-0 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Recipient</th>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.recentEmails.map((event) => (
                      <tr key={event.id} className="border-b border-slate-100 align-top">
                        <td className="px-0 py-3 text-slate-600 whitespace-nowrap">{fmtDate(event.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-700 break-all">{event.to.join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{event.subject || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${eventTone(event.lastEvent)}`}>
                            {event.lastEvent}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_26px_rgba(2,6,23,0.06)]">
                <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">WEBHOOK HISTORY</div>
                <h2 className="mt-2 text-xl font-extrabold text-[#0a2230]">Persisted Internal Event Log</h2>
                {snapshot.recentWebhookEvents.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    No webhook events have been recorded yet. After the next Resend webhook arrives, this section will keep a durable internal history.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {snapshot.recentWebhookEvents.slice(0, 8).map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${eventTone(event.eventType)}`}>
                            {event.eventType}
                          </span>
                          <span className="text-sm font-semibold text-[#0a2230]">{event.subject || "No subject recorded"}</span>
                        </div>
                        <div className="mt-2 text-sm text-slate-700 break-all">Recipient: {event.recipient || "—"}</div>
                        <div className="mt-1 text-[12px] text-slate-500">Occurred: {fmtDate(event.occurredAt || event.createdAt)}</div>
                        <div className="mt-1 text-[12px] text-slate-500 break-all">Provider message ID: {event.providerMessageId || "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_26px_rgba(2,6,23,0.06)]">
                <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">WEEKLY ROUTINE</div>
                <h2 className="mt-2 text-xl font-extrabold text-[#0a2230]">What to Check Every Week</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Review this page for new non-delivered events. If anything shows `bounced`, `complained`, or `failed`, investigate the affected recipient immediately.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    In Resend, review suppressions, complaints, and hard bounces. Do not keep retrying those addresses.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Check DMARC aggregate reports sent to `dmarc-reports@sailboattrade.com` for authentication drift or unexpected senders.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Open Google Postmaster Tools for <span className="font-semibold">{snapshot.rootDomain || "your root domain"}</span> and review spam rate, domain reputation, authentication, and delivery errors.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Confirm new webhook events are appearing in the persisted log below. If Resend shows deliveries but webhook history is empty, inspect the webhook secret and endpoint health.
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_26px_rgba(2,6,23,0.06)]">
                <div className="text-[12px] font-extrabold tracking-[0.16em] text-slate-500">ISSUES TO REVIEW</div>
                <h2 className="mt-2 text-xl font-extrabold text-[#0a2230]">Recent Non-Delivered Events</h2>
                {snapshot.problematicEvents.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                    No recent non-delivered events were found in the latest Resend window.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {snapshot.problematicEvents.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${eventTone(event.lastEvent)}`}>
                            {event.lastEvent}
                          </span>
                          <span className="text-sm font-semibold text-[#0a2230]">{event.subject || "—"}</span>
                        </div>
                        <div className="mt-2 text-sm text-slate-700 break-all">To: {event.to.join(", ") || "—"}</div>
                        <div className="mt-1 text-[12px] text-slate-500">Sent: {fmtDate(event.createdAt)}</div>
                        <div className="mt-1 text-[12px] text-slate-500 break-all">Message ID: {event.id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
