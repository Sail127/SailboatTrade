"use client";

import Link from "next/link";
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

const USERS_PER_PAGE = 30;
const SORT_OPTIONS = [
  { value: "created_desc", label: "Newest Registered" },
  { value: "created_asc", label: "Oldest Registered" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "listings_desc", label: "Most Listings" },
  { value: "listings_asc", label: "Fewest Listings" },
];

export default function AdminUsersClient({
  initialUsers,
  currentAdminId = "",
  canManageUserAccess = false,
  initialQuery = "",
  initialExpandedUserId = "",
}) {
  const [users, setUsers] = useState(Array.isArray(initialUsers) ? initialUsers : []);
  const [q, setQ] = useState(String(initialQuery || ""));
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [expandedUserIds, setExpandedUserIds] = useState(initialExpandedUserId ? [initialExpandedUserId] : []);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_desc");
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

  const sortedUsers = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      if (sortBy === "name_asc") {
        return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: "base" });
      }
      if (sortBy === "name_desc") {
        return displayName(b).localeCompare(displayName(a), undefined, { sensitivity: "base" });
      }
      if (sortBy === "created_asc") {
        return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
      }
      if (sortBy === "listings_desc") {
        return (b?.listingsCount || 0) - (a?.listingsCount || 0) || new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
      }
      if (sortBy === "listings_asc") {
        return (a?.listingsCount || 0) - (b?.listingsCount || 0) || new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
      }
      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    });
    return next;
  }, [filtered, sortBy]);

  const staffUsers = useMemo(
    () => sortedUsers.filter((user) => user.role === "ADMIN" || user.role === "MODERATOR"),
    [sortedUsers]
  );
  const memberUsers = useMemo(() => sortedUsers.filter((user) => user.role === "USER"), [sortedUsers]);

  const totalPages = Math.max(1, Math.ceil(memberUsers.length / USERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * USERS_PER_PAGE;
    return memberUsers.slice(start, start + USERS_PER_PAGE);
  }, [memberUsers, safePage]);

  async function refreshUsers() {
    setMsg("");
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setMsg(data?.error || "Could not load users.");
      return;
    }
    setUsers(Array.isArray(data.users) ? data.users : []);
    setPage(1);
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

    setExpandedUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
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
    setExpandedUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
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

  function toggleExpanded(userId) {
    setExpandedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
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

  function renderUserCard(user) {
    const busy = busyId === user.id;
    const isSelf = user.id === currentAdminId;
    const composerOpen = composeUserId === user.id;
    const eventState = eventsByEmail[String(user.email || "").toLowerCase()] || null;
    const eventBusy = eventsLoadingEmail === String(user.email || "").toLowerCase();
    const expanded = expandedUserIds.includes(user.id) || composerOpen || Boolean(eventState);

    return (
      <div
        key={user.id}
        className="rounded-2xl border border-[#eadba9] bg-white p-4 shadow-[0_8px_18px_rgba(2,6,23,0.05)]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
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
                {user.businessName ? (
                  <span className="inline-flex items-center rounded-full border border-[#d9c486] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-semibold text-[#8a6a12]">
                    {user.businessName}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Joined</div>
              <div className="mt-1 text-[13px] font-medium text-[#0a2230]">{fmtDate(user.createdAt)}</div>
            </div>
          </div>

          <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Listings</div>
                <div className="mt-1 text-[13px] font-medium text-[#0a2230]">
                  {user.listingsCount > 0 ? (
                    <Link
                      href={`/dashboard/admin/active-listings?ownerId=${encodeURIComponent(user.id)}`}
                      className="font-semibold text-[#0a2230] underline underline-offset-2 hover:text-[#18374a]"
                    >
                      {user.listingsCount}
                    </Link>
                  ) : (
                    user.listingsCount || 0
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Updated</div>
                <div className="mt-1 text-[13px] font-medium text-[#0a2230]">{fmtDate(user.updatedAt)}</div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Email</div>
                  <div className="mt-1 break-all text-[13px] text-slate-700">{user.email}</div>
                </div>

                <div className="flex shrink-0 items-start">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(user.id)}
                    aria-label={expanded ? "Collapse user details" : "Expand user details"}
                    title={expanded ? "Hide details" : "Show details"}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9c486] bg-[#fffaf0] text-[#8a6a12] hover:bg-[#fff5dc]"
                  >
                    <span
                      aria-hidden="true"
                      className={`text-lg leading-none transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {expanded ? (
          <div className="mt-4 rounded-2xl border border-[#eadba9] bg-[#fffaf0] p-4">
            <div className="grid gap-3 text-[12px] text-slate-600 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">User ID</div>
                <div className="mt-1 break-all font-medium text-[#0a2230]">{user.id}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Verification Attempt</div>
                <div className="mt-1 font-medium text-[#0a2230]">
                  {fmtDate(user.emailVerificationSentAt) || "Not recorded"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Business</div>
                <div className="mt-1 font-medium text-[#0a2230]">{user.businessName || "None"}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Email Status</div>
                <div className="mt-1 font-medium text-[#0a2230]">
                  {user.emailVerified ? "Verified" : "Awaiting verification"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Listings</div>
                <div className="mt-1 font-medium text-[#0a2230]">
                  {user.listingsCount > 0 ? (
                    <Link
                      href={`/dashboard/admin/active-listings?ownerId=${encodeURIComponent(user.id)}`}
                      className="font-semibold text-[#0a2230] underline underline-offset-2 hover:text-[#18374a]"
                    >
                      {user.listingsCount}
                    </Link>
                  ) : (
                    user.listingsCount || 0
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Favorites</div>
                <div className="mt-1 font-medium text-[#0a2230]">{user.favoritesCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Audit Logs</div>
                <div className="mt-1 font-medium text-[#0a2230]">{user.auditLogsCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Joined</div>
                <div className="mt-1 font-medium text-[#0a2230]">{fmtDate(user.createdAt)}</div>
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Updated</div>
                <div className="mt-1 font-medium text-[#0a2230]">{fmtDate(user.updatedAt)}</div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[11px] font-extrabold tracking-[0.14em] text-slate-500">ROLE</label>
              {canManageUserAccess ? (
                <>
                  <select
                    value={user.role}
                    disabled={busy || isSelf}
                    onChange={(e) => updateRole(user, e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {isSelf ? "Your own role can’t be changed here." : "Promote or demote this user."}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-1 flex h-10 items-center rounded-xl border border-[#d9c486] bg-slate-100 px-3 text-sm font-semibold text-[#0a2230]">
                    {user.role}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Moderators can review users here, but only admins can change roles.
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!user.emailVerified ? (
                <button
                  type="button"
                  onClick={() => resendWelcomeEmail(user)}
                  disabled={busy}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Working…" : "Resend welcome"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => (composerOpen ? closeComposer() : openComposer(user))}
                disabled={busy}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {composerOpen ? "Close Message" : "Email User"}
              </button>

              <button
                type="button"
                onClick={() => loadEmailEvents(user)}
                disabled={busy || eventBusy}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {eventBusy ? "Loading…" : "Email Events"}
              </button>

              {canManageUserAccess ? (
                <button
                  type="button"
                  onClick={() => deleteUser(user)}
                  disabled={busy || isSelf}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Working…" : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {composerOpen ? (
          <div className="mt-4 rounded-2xl border border-[#eadba9] bg-[#fffaf0] p-4">
            <div className="text-[12px] font-extrabold tracking-[0.14em] text-[#8a6a12]">SEND EMAIL</div>
            <div className="mt-1 text-[12px] text-slate-600">Send a direct message to {user.email}.</div>

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
              <div className="text-[12px] font-extrabold tracking-[0.14em] text-slate-500">RECENT EMAIL EVENTS</div>
              <div className="text-[11px] text-slate-500">Refreshed {fmtDate(eventState.loadedAt)}</div>
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
              <div className="mt-3 text-sm text-slate-600">No recent email events were found for this recipient.</div>
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
                    <div className="mt-1 break-all text-[12px] text-slate-600">Message ID: {event.id}</div>
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
	              onChange={(e) => {
	                setQ(e.target.value);
	                setPage(1);
	              }}
	              placeholder="Search by name, email, role, or ID…"
	              className="h-11 w-full rounded-xl border border-[#d9c486] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40 sm:w-[320px]"
	            />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-[#d9c486] bg-white px-3 text-sm font-semibold text-[#0a2230] outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
              aria-label="Sort users"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            {staffUsers.length > 0 ? (
              <div className="rounded-2xl border border-[#d9c486] bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-extrabold tracking-[0.16em] text-[#8a6a12]">STAFF</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Admins and moderators are pinned here for quick access.
                    </div>
                  </div>
                  <div className="rounded-full border border-[#d9c486] bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-[#8a6a12]">
                    {staffUsers.length} staff
                  </div>
                </div>
                <div className="mt-4 space-y-3">{staffUsers.map((user) => renderUserCard(user))}</div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eadba9] bg-white/70 px-4 py-3 text-sm text-slate-600">
	              <span>
		                Showing {memberUsers.length === 0 ? 0 : Math.min(memberUsers.length, (safePage - 1) * USERS_PER_PAGE + 1)}-
		                {Math.min(memberUsers.length, safePage * USERS_PER_PAGE)} of {memberUsers.length} members
		              </span>
	              <span>{USERS_PER_PAGE} per page</span>
	            </div>

	            {pagedUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d9c486] bg-white/70 p-5 text-sm text-slate-600">
                  No member accounts match your current search.
                </div>
              ) : (
                pagedUsers.map((user) => renderUserCard(user))
              )}

	            {totalPages > 1 ? (
	              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
	                <button
	                  type="button"
	                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
	                  disabled={safePage <= 1}
	                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d9c486] bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-50"
	                >
	                  Prev
	                </button>
	                <div className="px-2 text-sm text-slate-600">
	                  Page {safePage} of {totalPages}
	                </div>
	                <button
	                  type="button"
	                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
	                  disabled={safePage >= totalPages}
	                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d9c486] bg-white px-4 text-sm font-semibold text-[#0a2230] hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-50"
	                >
	                  Next
	                </button>
	              </div>
	            ) : null}
	          </div>
	        )}
	      </div>
    </div>
  );
}
