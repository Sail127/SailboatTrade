"use client";

import { useMemo, useState } from "react";

function fmtDate(value) {
  try {
    return value ? new Date(value).toLocaleString() : "";
  } catch {
    return "";
  }
}

function displayName(user) {
  const first = String(user?.firstName || "").trim();
  const last = String(user?.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || String(user?.name || "").trim() || "Unnamed user";
}

function roleTone(role) {
  if (role === "ADMIN") return "border-amber-300 bg-amber-50 text-amber-900";
  if (role === "MODERATOR") return "border-sky-300 bg-sky-50 text-sky-900";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

export default function AdminUsersClient({ initialUsers, currentAdminId = "" }) {
  const [users, setUsers] = useState(Array.isArray(initialUsers) ? initialUsers : []);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [composeUserId, setComposeUserId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [eventsByEmail, setEventsByEmail] = useState({});
  const [eventsLoadingEmail, setEventsLoadingEmail] = useState("");

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return users;
    return users.filter((user) => {
      return (
        String(user.id || "").toLowerCase().includes(search) ||
        String(user.email || "").toLowerCase().includes(search) ||
        String(displayName(user)).toLowerCase().includes(search) ||
        String(user.businessName || "").toLowerCase().includes(search) ||
        String(user.role || "").toLowerCase().includes(search)
      );
    });
  }, [q, users]);

  async function refreshUsers() {
    setMsg("");
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Could not load users.");
      return;
    }
    setUsers(Array.isArray(data.users) ? data.users : []);
  }

  async function deleteUser(user) {
    if (!user?.id) return;

    const label = `${displayName(user)} (${user.email || user.id})`;
    const confirmed = window.confirm(
      `Delete ${label} completely?\n\nThis removes the user account, their listings, favorites, and admin audit logs. This cannot be undone.`
    );
    if (!confirmed) return;

    setBusyId(user.id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not delete user.");
      }

      setUsers((prev) => prev.filter((x) => x.id !== user.id));
      setMsg(`Deleted ${data?.deletedEmail || label}.`);
    } catch (err) {
      setMsg(err?.message || "Could not delete user.");
    } finally {
      setBusyId("");
    }
  }

  async function updateRole(user, nextRole) {
    if (!user?.id || !nextRole || nextRole === user.role) return;

    setBusyId(user.id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not update role.");
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: data?.user?.role || nextRole,
              }
            : item
        )
      );
      setMsg(`Updated ${displayName(user)} to ${data?.user?.role || nextRole}.`);
    } catch (err) {
      setMsg(err?.message || "Could not update role.");
    } finally {
      setBusyId("");
    }
  }

  async function resendWelcomeEmail(user) {
    if (!user?.id || user?.emailVerified) return;

    setBusyId(user.id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/resend-welcome`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not resend welcome email.");
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                emailVerificationSentAt: data?.sentAt || new Date().toISOString(),
              }
            : item
        )
      );
      setMsg(`Welcome email resent to ${data?.email || user.email}.`);
    } catch (err) {
      setMsg(err?.message || "Could not resend welcome email.");
    } finally {
      setBusyId("");
    }
  }

  async function loadEmailEvents(user) {
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) return;

    setEventsLoadingEmail(email);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/email-events?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not load email events.");
      }

      setEventsByEmail((prev) => ({
        ...prev,
        [email]: {
          loadedAt: Date.now(),
          warning: data?.warning || "",
          user: data?.user || null,
          events: Array.isArray(data.events) ? data.events : [],
        },
      }));
    } catch (err) {
      setMsg(err?.message || "Could not load email events.");
    } finally {
      setEventsLoadingEmail("");
    }
  }

  function openComposer(user) {
    if (!user?.id) return;
    setComposeUserId(user.id);
    setComposeSubject(`Message from SailboatTrade`);
    setComposeMessage("");
    setMsg("");
  }

  function closeComposer() {
    setComposeUserId("");
    setComposeSubject("");
    setComposeMessage("");
  }

  async function sendMessage(user) {
    if (!user?.id) return;
    const subject = String(composeSubject || "").trim();
    const message = String(composeMessage || "").trim();
    if (!subject) {
      setMsg("Please enter a subject.");
      return;
    }
    if (!message) {
      setMsg("Please enter a message.");
      return;
    }

    setBusyId(user.id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not send message.");
      }

      setMsg(`Message sent to ${data?.email || user.email}.`);
      closeComposer();
    } catch (err) {
      setMsg(err?.message || "Could not send message.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="rounded-3xl border border-[#e7d7a6] bg-[linear-gradient(180deg,#fffdf7_0%,#fff7df_100%)] shadow-[0_16px_35px_rgba(2,6,23,0.08)]">
      <div className="border-b border-[#eadba9] px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[12px] font-extrabold tracking-[0.18em] text-[#8a6a12]">ADMIN CONTROLS</div>
            <h2 className="mt-2 text-2xl font-extrabold text-[#0a2230]">User Management</h2>
            <p className="mt-1 text-sm text-slate-700">
              Review all site users and permanently remove accounts when necessary.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, role, or ID…"
              className="h-11 w-full rounded-xl border border-[#d9c486] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 sm:w-[320px]"
            />
            <button
              type="button"
              onClick={refreshUsers}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9c486] bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-[#fffaf0]"
            >
              Refresh
            </button>
          </div>
        </div>

        {msg ? (
          <div className="mt-4 rounded-xl border border-[#e3d3a1] bg-white/80 px-4 py-3 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9c486] bg-white/70 p-5 text-sm text-slate-600">
            No users match your current search.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((user) => {
              const busy = busyId === user.id;
              const isSelf = user.id === currentAdminId;
              const composerOpen = composeUserId === user.id;
              const eventState = eventsByEmail[String(user.email || "").toLowerCase()] || null;
              const eventBusy = eventsLoadingEmail === String(user.email || "").toLowerCase();
              return (
                <div
                  key={user.id}
                  className="rounded-2xl border border-[#eadba9] bg-white p-4 shadow-[0_8px_18px_rgba(2,6,23,0.05)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[15px] font-extrabold text-[#0a2230]">{displayName(user)}</div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleTone(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            user.emailVerified
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-amber-300 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {user.emailVerified ? "Email verified" : "Email unverified"}
                        </span>
                      </div>

                      <div className="mt-1 break-all text-[13px] text-slate-700">{user.email}</div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600">
                        <span>User ID: {user.id}</span>
                        {user.businessName ? <span>Business: {user.businessName}</span> : null}
                        <span>Listings: {user.listingsCount || 0}</span>
                        <span>Favorites: {user.favoritesCount || 0}</span>
                        <span>Joined: {fmtDate(user.createdAt)}</span>
                        <span>Verification send attempt: {fmtDate(user.emailVerificationSentAt) || "Not recorded"}</span>
                        <span>Updated: {fmtDate(user.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:min-w-[220px]">
                      <label className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">
                        ROLE
                      </label>
                      <select
                        value={user.role}
                        disabled={busy || isSelf}
                        onChange={(e) => updateRole(user, e.target.value)}
                        className="h-10 rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <div className="text-[11px] text-slate-500">
                        {isSelf ? "Your own role can’t be changed here." : "Change role to promote or demote this user."}
                      </div>

                      {!user.emailVerified ? (
                        <button
                          type="button"
                          onClick={() => resendWelcomeEmail(user)}
                          disabled={busy}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? "Working…" : "Resend welcome email"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => (composerOpen ? closeComposer() : openComposer(user))}
                        disabled={busy}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {composerOpen ? "Close Message" : "Email User"}
                      </button>

                      <button
                        type="button"
                        onClick={() => loadEmailEvents(user)}
                        disabled={busy || eventBusy}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {eventBusy ? "Loading events…" : "View Email Events"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(user)}
                        disabled={busy || isSelf}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? "Working…" : "Delete User"}
                      </button>
                    </div>
                  </div>

                  {composerOpen ? (
                    <div className="mt-4 rounded-2xl border border-[#eadba9] bg-[#fffaf0] p-4">
                      <div className="text-[12px] font-extrabold tracking-[0.14em] text-[#8a6a12]">
                        SEND EMAIL
                      </div>
                      <div className="mt-1 text-[12px] text-slate-600">
                        Send a direct message to {user.email}.
                      </div>

                      <div className="mt-3 space-y-3">
                        <input
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Subject"
                          className="h-10 w-full rounded-xl border border-[#d9c486] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                        />
                        <textarea
                          value={composeMessage}
                          onChange={(e) => setComposeMessage(e.target.value)}
                          placeholder="Write your message here..."
                          rows={5}
                          className="w-full rounded-xl border border-[#d9c486] bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => sendMessage(user)}
                            disabled={busy}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0a2230] px-4 text-sm font-semibold text-white hover:bg-[#0f2a3b] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? "Sending…" : "Send Email"}
                          </button>
                          <button
                            type="button"
                            onClick={closeComposer}
                            disabled={busy}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {eventState ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[12px] font-extrabold tracking-[0.14em] text-slate-500">
                          RECENT EMAIL EVENTS
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Refreshed {fmtDate(eventState.loadedAt)}
                        </div>
                      </div>

                      {eventState.warning ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                          {eventState.warning}
                        </div>
                      ) : null}

                      {eventState.user ? (
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600">
                          <span>Account created: {fmtDate(eventState.user.createdAt) || "Unknown"}</span>
                          <span>Verification recorded: {fmtDate(eventState.user.emailVerificationSentAt) || "Not recorded"}</span>
                          <span>Verified: {fmtDate(eventState.user.emailVerifiedAt) || "Not yet"}</span>
                        </div>
                      ) : null}

                      {eventState.events.length === 0 ? (
                        <div className="mt-3 text-sm text-slate-600">
                          No recent email events were found for this recipient.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {eventState.events.map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-[#0a2230]">{event.subject || "(No subject)"}</span>
                                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                  {event.lastEvent || "unknown"}
                                </span>
                                {event.source ? (
                                  <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                    {event.source}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 break-all text-[12px] text-slate-600">
                                Message ID: {event.id}
                              </div>
                              <div className="mt-1 text-[12px] text-slate-600">
                                Sent: {fmtDate(event.createdAt)} | From: {event.from || "Unknown sender"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
