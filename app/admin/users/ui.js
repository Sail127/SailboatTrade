"use client";

import { useState } from "react";

export default function AdminUsersTable({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers || []);
  const [busyId, setBusyId] = useState("");

  async function act(id, payload) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Action failed");

      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)));
    } catch (e) {
      alert(e?.message || "Action failed");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="text-left px-4 py-3">User</th>
            <th className="text-left px-4 py-3">Role</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const disabled = Boolean(u.isDisabled || u.deletedAt);
            const busy = busyId === u.id;

            return (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#0a2230]">{u.email}</div>
                  <div className="text-xs text-slate-500">{u.name || ""}</div>
                </td>

                <td className="px-4 py-3">
                  <select
                    className="h-9 rounded-xl border px-2"
                    defaultValue={u.role}
                    disabled={busy || !!u.deletedAt}
                    onChange={(e) => act(u.id, { action: "SET_ROLE", role: e.target.value })}
                  >
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>

                <td className="px-4 py-3">
                  {u.deletedAt ? (
                    <span className="text-red-700 font-semibold">DELETED</span>
                  ) : disabled ? (
                    <span className="text-amber-700 font-semibold">DISABLED</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">ACTIVE</span>
                  )}
                </td>

                <td className="px-4 py-3 flex flex-wrap gap-2">
                  {!u.deletedAt && (
                    <>
                      {disabled ? (
                        <button
                          disabled={busy}
                          className="h-9 rounded-full border px-3 font-semibold"
                          onClick={() => act(u.id, { action: "ENABLE" })}
                        >
                          Enable
                        </button>
                      ) : (
                        <button
                          disabled={busy}
                          className="h-9 rounded-full border px-3 font-semibold"
                          onClick={() => act(u.id, { action: "DISABLE" })}
                        >
                          Disable
                        </button>
                      )}

                      <button
                        disabled={busy}
                        className="h-9 rounded-full border border-red-200 bg-red-50 px-3 font-semibold text-red-700"
                        onClick={() => {
                          if (confirm("Soft-delete this user? Their listings will be removed.")) {
                            act(u.id, { action: "DELETE_SOFT" });
                          }
                        }}
                      >
                        Delete (soft)
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {!users.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-slate-600">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
