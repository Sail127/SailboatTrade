// components/Header.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { notifyAuthChanged, onAuthChanged } from "@/lib/auth-client";
import BrandWordmark from "@/components/BrandWordmark";

const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

const ME_ENDPOINT = "/api/auth/me";
const LOGOUT_ENDPOINT = "/api/auth/logout";

const LOGIN_HREF = "/login";

const SEARCH_GOLD = "#f3b23f";
const GOLD = SEARCH_GOLD;

function hardNav(href) {
  if (typeof window === "undefined") return;
  window.location.assign(href);
}

function MenuIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </>
      )}
    </svg>
  );
}

function UserSilhouetteIcon({ className = "h-5 w-5", stroke = "#ffffff" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BinocularsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.4 6.2c.2-.7.9-1.2 1.6-1.2h.7c.7 0 1.3.5 1.5 1.1l.8 2.6h.9l.8-2.6c.2-.6.8-1.1 1.5-1.1h.7c.7 0 1.4.5 1.6 1.2l1.3 4.5c.1.2.1.5.1.8v6.3c0 .7-.6 1.3-1.3 1.3H16c-1.8 0-3.3-1.5-3.3-3.3v-2.2h-1.4v2.2c0 1.8-1.5 3.3-3.3 3.3H5.3c-.7 0-1.3-.6-1.3-1.3v-6.3c0-.3 0-.5.1-.8l1.3-4.5Zm1.7 3.9-1.6 0c-1.5 0-2.8 1.2-2.8 2.8v2c0 1.5 1.2 2.8 2.8 2.8h.6c1.5 0 2.8-1.2 2.8-2.8v-2c0-1.3-.9-2.5-2.2-2.8Zm7.4 0-1.6 0c-1.3.3-2.2 1.5-2.2 2.8v2c0 1.5 1.2 2.8 2.8 2.8h.6c1.5 0 2.8-1.2 2.8-2.8v-2c0-1.5-1.2-2.8-2.8-2.8Z"
      />
      <circle cx="8.2" cy="14.9" r="1.8" fill="rgba(255,255,255,0.22)" />
      <circle cx="15.8" cy="14.9" r="1.8" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill={GOLD}
        d="M12 2c.6 0 1 .4 1 1v1.1c2.3.3 4 1.6 4.6 3.6.2.5-.1 1.1-.7 1.3-.5.2-1.1-.1-1.3-.7-.4-1.3-1.5-2.1-3.1-2.3V12c2.9.6 4.8 2 4.8 4.7 0 2.4-1.8 3.9-4.8 4.2V22c0 .6-.4 1-1 1s-1-.4-1-1v-1.1c-2.6-.3-4.5-1.7-5.1-4-.2-.5.2-1.1.7-1.3.5-.2 1.1.2 1.3.7.5 1.6 1.8 2.5 3.1 2.7v-5.6c-2.7-.6-4.6-1.9-4.6-4.6 0-2.3 1.7-3.8 4.6-4.1V3c0-.6.4-1 1-1Zm-1 5.2c-1.6.2-2.6 1-2.6 2.3 0 1.4 1 2 2.6 2.4V7.2Zm2 12.6c1.9-.2 2.9-1 2.9-2.5 0-1.6-1.2-2.2-2.9-2.6v5.1Z"
      />
    </svg>
  );
}

function initialsFromUser(user) {
  const fn = (user?.firstName || "").trim();
  const ln = (user?.lastName || "").trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();

  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }

  const email = (user?.email || "").trim();
  if (email) return email.split("@")[0].slice(0, 2).toUpperCase();

  return "";
}

function LogoutIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function DashboardChip({ user }) {
  return (
    <span className="h-6 w-6 rounded-full bg-white/10 ring-1 ring-white/15 grid place-items-center text-[11px] font-extrabold tracking-wide">
      {initialsFromUser(user) || "U"}
    </span>
  );
}

function MenuItemLink({ href, onPick, icon, children }) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="flex items-center justify-between px-3 py-2 text-[13px] font-semibold text-white hover:bg-white/10 transition"
      role="menuitem"
    >
      <span className="flex items-center gap-3">
        {icon ? <span className="inline-flex h-6 w-6 items-center justify-center shrink-0">{icon}</span> : null}
        <span className="text-white">{children}</span>
      </span>
      <span className="text-white/35 text-lg leading-none">›</span>
    </Link>
  );
}

/** Account button behavior:
 * - Logged OUT: circle silhouette (no gold), click -> /login
 * - Logged IN: gold initials circle, click -> dropdown links
 */
function AccountMenu({ user, loading, onLogout, onBeforeNav }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const isAuthed = Boolean(user);
  const initials = isAuthed ? initialsFromUser(user) : "";

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Logged OUT
  if (!isAuthed) {
    return (
      <button
        type="button"
        aria-label="Login"
        title="Login"
        className={[
          "h-10 w-10 aspect-square flex-none",
          "inline-flex items-center justify-center",
          "rounded-full",
          "border border-white/15 bg-white/5 text-white",
          "hover:bg-white/10 hover:border-white/25 transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b23f]/40",
          "shrink-0",
        ].join(" ")}
        onClick={() => {
          onBeforeNav?.();
          hardNav(LOGIN_HREF);
        }}
      >
        {loading ? (
          <span className="h-4 w-4 rounded-full bg-white/20 animate-pulse" />
        ) : (
          <UserSilhouetteIcon className="h-5 w-5" stroke="#ffffff" />
        )}
      </button>
    );
  }

  // Logged IN
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Account menu"
        title="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          "h-10 w-10 aspect-square flex-none p-0 rounded-full overflow-hidden",
          "inline-flex items-center justify-center leading-none",
          "transition shadow-md shadow-black/20 hover:brightness-105 active:brightness-95",
          "ring-1 ring-black/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(243,178,63,0.45)]",
        ].join(" ")}
        style={{ background: SEARCH_GOLD }}
        onClick={() => setOpen((v) => !v)}
      >
        {loading ? (
          <span className="h-4 w-4 rounded-full bg-black/15 animate-pulse" />
        ) : (
          <span className="text-[12px] font-extrabold tracking-wide text-[#0a2230]">
            {initials || "U"}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />

          <div
            className="absolute right-0 mt-2 w-60 rounded-xl border border-white/15 bg-[#0f2a3b]/98 backdrop-blur shadow-2xl shadow-black/25 z-50 overflow-hidden text-white"
            role="menu"
          >
            <div className="py-1">
              {/* ✅ My Dashboard with SAME icon style as hamburger */}
              <MenuItemLink
                href="/dashboard"
                onPick={() => setOpen(false)}
                icon={<DashboardChip user={user} />}
              >
                My Dashboard
              </MenuItemLink>

              <MenuItemLink href="/dashboard/listings" onPick={() => setOpen(false)}>
                My Listings
              </MenuItemLink>

              <MenuItemLink href="/listings/new" onPick={() => setOpen(false)}>
                Create listing
              </MenuItemLink>

              <MenuItemLink href="/dashboard/favorites" onPick={() => setOpen(false)}>
                Favorite Boats
              </MenuItemLink>

              <MenuItemLink href="/dashboard/alerts" onPick={() => setOpen(false)}>
                Email Alerts
              </MenuItemLink>
            </div>

            <div className="border-t border-white/15 p-1">
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  onBeforeNav?.();
                  await onLogout?.();
                }}
                className="w-full text-left px-3 py-2 text-[13px] font-semibold text-white hover:bg-white/10 rounded-lg transition"
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  {/* ✅ Log Out icon SAME as hamburger */}
                  <span className="inline-flex h-6 w-6 items-center justify-center shrink-0">
                    <LogoutIcon />
                  </span>
                  <span>Log Out</span>
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const isListingsBrowse = pathname === "/listings";

  const [open, setOpen] = useState(false); // hamburger
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  const [meLoading, setMeLoading] = useState(true);
  const [meUser, setMeUser] = useState(null);

  const refreshMe = useCallback(async () => {
    setMeLoading(true);
    try {
      const res = await fetch(ME_ENDPOINT, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "cache-control": "no-store" },
      });
      if (!res.ok) throw new Error("not authed");
      const data = await res.json().catch(() => ({}));
      setMeUser(data?.user || data?.me || null);
    } catch {
      setMeUser(null);
    } finally {
      setMeLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [pathname, refreshMe]);

  useEffect(() => {
    return onAuthChanged(() => refreshMe());
  }, [refreshMe]);

  useEffect(() => {
    function onFocus() {
      refreshMe();
    }
    function onVis() {
      if (document.visibilityState === "visible") refreshMe();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshMe]);

  async function onLogout() {
    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      setMeUser(null);
      setMeLoading(false);
      setOpen(false);
      notifyAuthChanged();
      hardNav("/");
    }
  }

  useEffect(() => {
    function onDocMouseDown(e) {
      if (open && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLink =
    "flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-white/90 hover:bg-black/10 hover:text-white transition";
  const iconBox = "inline-flex h-6 w-6 items-center justify-center shrink-0";
  const navPrimary =
    navLink + " text-[15px] text-white/95 hover:bg-[#f3b23f]/10 hover:ring-1 hover:ring-[#f3b23f]/25";
  const navSecondary = navLink + " text-[13px] text-white/85";
  const logoutBtn =
    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold text-white/90 hover:bg-white/10 transition text-left";

  return (
    <header
      className={[
        "sticky top-0 z-50",
        "bg-[#0a2230]/95 backdrop-blur",
        "border-b border-white/10",
        scrolled ? "shadow-lg shadow-black/20" : "shadow-none",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-full h-8 bg-gradient-to-b from-[#0a2230]/35 to-transparent" />

      <div className={`${CONTAINER} h-16`}>
        <div className="relative h-full flex items-center">
          <Link
            href="/"
            className="flex items-center shrink-0"
            aria-label="Go to homepage"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/burgee.png"
              alt="SailboatTrade burgee"
              width={72}
              height={72}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>

          <Link
            href="/"
            className="ml-3 leading-tight text-left hidden sm:block"
            onClick={() => setOpen(false)}
          >
            <BrandWordmark
              tone="dark"
              className="text-xl sm:text-2xl font-bold text-white leading-none whitespace-nowrap"
            />
            <div className="text-[11px] text-slate-300">Built by Sailors – For Sailors</div>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0">
            <input
              type="search"
              placeholder="Search…"
              className={[
                "h-9 rounded-lg border border-white/15 bg-white text-[#0a2230]",
                "px-3 text-sm outline-none focus:ring-2 focus:ring-[#f3b23f]/40",
                isListingsBrowse ? "min-w-0 w-[120px] sm:w-44 md:w-48" : "flex-1 min-w-0 w-[140px] sm:w-56",
              ].join(" ")}
            />

            <AccountMenu
              user={meUser}
              loading={meLoading}
              onLogout={onLogout}
              onBeforeNav={() => setOpen(false)}
            />

            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                className={[
                  "h-10 w-10 inline-flex items-center justify-center rounded-lg",
                  "border border-white/15 bg-white/5 text-white",
                  "hover:bg-white/10 hover:border-white/25 transition",
                  open ? "ring-2 ring-white/15" : "",
                ].join(" ")}
              >
                <MenuIcon open={open} />
              </button>

              {open && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-white/10 backdrop-blur-[2px]"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                  />

                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/15 bg-[#0f2a3b]/98 backdrop-blur shadow-2xl shadow-black/25 p-2 z-50 text-white">
                    <Link href="/listings" className={navPrimary} onClick={() => setOpen(false)}>
                      <span className={iconBox}>
                        <BinocularsIcon />
                      </span>
                      Browse all Sailboats
                    </Link>

                    <Link href="/listings/new" className={navPrimary} onClick={() => setOpen(false)}>
                      <span className={iconBox}>
                        <DollarIcon />
                      </span>
                      Post a Sailboat Listing
                    </Link>

                    <div className="my-2 h-px bg-white/15" />

                    <a
                      href={meUser ? "/dashboard" : "/login?next=/dashboard"}
                      className={navSecondary}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        hardNav(meUser ? "/dashboard" : "/login?next=/dashboard");
                      }}
                    >
                      <span className={iconBox}>
                        {meUser ? <DashboardChip user={meUser} /> : <UserSilhouetteIcon className="h-4 w-4" stroke="#ffffff" />}
                      </span>
                      {meUser ? "My Dashboard" : "Login"}
                    </a>

                    {meUser && (
                      <button type="button" onClick={onLogout} className={logoutBtn}>
                        <span className={iconBox} aria-hidden="true">
                          <LogoutIcon />
                        </span>
                        Log Out
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
