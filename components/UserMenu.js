// components/UserMenu.js
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function UserMenu({ initials = "U", favoritesCount = null }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-full grid place-items-center text-sm font-extrabold text-[#0a2230] bg-[#c8a44d] hover:brightness-95 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initials}
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="py-1">
            <MenuLink href="/dashboard/listings" onPick={() => setOpen(false)}>
              My Listings
            </MenuLink>

            <MenuLink href="/listings/new" onPick={() => setOpen(false)}>
              Create listing
            </MenuLink>

            <MenuLink href="/dashboard/favorites" onPick={() => setOpen(false)}>
              Favorite Boats
              {typeof favoritesCount === "number" ? (
                <span className="ml-2 text-xs text-slate-500">{favoritesCount}</span>
              ) : null}
            </MenuLink>

            <MenuLink href="/dashboard/alerts" onPick={() => setOpen(false)}>
              Email Alerts
            </MenuLink>

            <MenuLink href="/dashboard/account" onPick={() => setOpen(false)}>
              Account
            </MenuLink>
          </div>

          <div className="border-t border-slate-200 p-2">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                } catch {
                  // ignore and continue redirect
                }
                window.location.assign("/");
              }}
            >
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-[#0a2230] hover:bg-slate-50 text-left"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, onPick, children }) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-[#0a2230] hover:bg-slate-50"
      role="menuitem"
    >
      <span>{children}</span>
      <span className="text-slate-300">›</span>
    </Link>
  );
}
