// components/Header.js
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const CONTAINER = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

/**
 * AUTH ENDPOINTS (adjust if needed)
 * - ME_ENDPOINT should return { user: { name?, email? } } when logged in
 * - LOGOUT_ENDPOINT should clear session/cookie and return 200
 */
const ME_ENDPOINT = "/api/auth/me";
const LOGOUT_ENDPOINT = "/api/auth/logout";

const LOGIN_HREF = "/login";
const DASHBOARD_HREF = "/dashboard";

// ✅ Match your Search button gold
const SEARCH_GOLD = "#f3b23f";

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

/* Small user silhouette icon */
function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
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

/* Binoculars icon (big round, obvious) */
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

/* Bold gold $ icon as SVG (aligned with binoculars) */
function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        fill="#c8a44d"
        d="M12 2c.6 0 1 .4 1 1v1.1c2.3.3 4 1.6 4.6 3.6.2.5-.1 1.1-.7 1.3-.5.2-1.1-.1-1.3-.7-.4-1.3-1.5-2.1-3.1-2.3V12c2.9.6 4.8 2 4.8 4.7 0 2.4-1.8 3.9-4.8 4.2V22c0 .6-.4 1-1 1s-1-.4-1-1v-1.1c-2.6-.3-4.5-1.7-5.1-4-.2-.5.2-1.1.7-1.3.5-.2 1.1.2 1.3.7.5 1.6 1.8 2.5 3.1 2.7v-5.6c-2.7-.6-4.6-1.9-4.6-4.6 0-2.3 1.7-3.8 4.6-4.1V3c0-.6.4-1 1-1Zm-1 5.2c-1.6.2-2.6 1-2.6 2.3 0 1.4 1 2 2.6 2.4V7.2Zm2 12.6c1.9-.2 2.9-1 2.9-2.5 0-1.6-1.2-2.2-2.9-2.6v5.1Z"
      />
    </svg>
  );
}

/* ✅ Compute initials: first + last name (smart email fallback) */
function initialsFromUser(user) {
  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    // single word name: use first two letters
    return parts[0].slice(0, 2).toUpperCase();
  }

  const email = (user?.email || "").trim();
  if (email) {
    const local = email.split("@")[0] || "";
    // try adam.wright / adam_wright / adam-wright
    const segs = local.split(/[.\-_]+/).filter(Boolean);
    if (segs.length >= 2) return (segs[0][0] + segs[segs.length - 1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  return "";
}

/**
 * Account button in header:
 * - ✅ ALWAYS a true circle (enforced square)
 * - ✅ Gold matches search button
 * - ✅ initials are first + last name
 */
function AccountCircle({ user, loading, onClick }) {
  const isAuthed = Boolean(user);
  const initials = isAuthed ? initialsFromUser(user) : "";

  // ✅ hard enforce perfect circle
  const common =
    "h-10 w-10 aspect-square flex-none p-0 rounded-full overflow-hidden " +
    "inline-flex items-center justify-center leading-none " +
    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(243,178,63,0.45)]";

  // ✅ match search button gold
  const goldBtn =
    "text-[#0a2230] shadow-md shadow-black/20 " +
    "hover:brightness-105 active:brightness-95";

  const goldRing = "ring-1 ring-black/10";

  return (
    <Link
      href={isAuthed ? DASHBOARD_HREF : LOGIN_HREF}
      onClick={onClick}
      aria-label={isAuthed ? "Go to dashboard" : "Go to login"}
      title={isAuthed ? "Dashboard" : "Login"}
      className={[common, goldBtn, goldRing].join(" ")}
      style={{ background: SEARCH_GOLD }}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full bg-black/15 animate-pulse" />
      ) : isAuthed ? (
        <span className="text-[12px] font-extrabold tracking-wide">{initials}</span>
      ) : (
        <span className="translate-y-[0.5px]">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="#0a2230"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  // Auth state for header button
  const [meLoading, setMeLoading] = useState(true);
  const [meUser, setMeUser] = useState(null);

  // Fetch current user
  useEffect(() => {
    let alive = true;

    async function loadMe() {
      try {
        const res = await fetch(ME_ENDPOINT, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("not authed");
        const data = await res.json().catch(() => ({}));
        const u = data?.user || data?.me || null;
        if (!alive) return;
        setMeUser(u);
      } catch {
        if (!alive) return;
        setMeUser(null);
      } finally {
        if (!alive) return;
        setMeLoading(false);
      }
    }

    loadMe();
    return () => {
      alive = false;
    };
  }, []);

  // Logout handler (calls API then refreshes UI)
  async function onLogout() {
    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      setMeUser(null);
      setMeLoading(false);
      setOpen(false);
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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

  // Menu row base
  const navLink =
    "flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-white/90 hover:bg-black/10 hover:text-white transition";

  // Fixed-size icon box so text aligns perfectly
  const iconBox = "inline-flex h-6 w-6 items-center justify-center shrink-0";

  // Top 2 “primary” items: slightly larger + brighter + gold hover glow
  const navPrimary =
    navLink +
    " text-[15px] text-white/95 hover:bg-[#c8a44d]/10 hover:ring-1 hover:ring-[#c8a44d]/25";

  // Lower items: smaller font
  const navSecondary = navLink + " text-[13px] text-white/85";

  // Log out button style (menu)
  const logoutBtn =
    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold " +
    "text-white/90 hover:bg-white/10 transition text-left";

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
          {/* Left: burgee */}
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

          {/* Name + slogan */}
          <Link
            href="/"
            className="ml-3 leading-tight text-left hidden sm:block"
            onClick={() => setOpen(false)}
          >
            <div
              className="text-xl sm:text-2xl font-bold text-white leading-none whitespace-nowrap"
              style={{
                fontFamily: "var(--font-brand, inherit)",
                letterSpacing: "0.03em",
                textShadow: "0 1px 0 rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.18)",
              }}
            >
              Sailboat<span className="text-[#c8a44d]">Trade</span>
              <span className="text-slate-300" style={{ letterSpacing: "0.06em" }}>
                .com
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Built by Sailors – For Sailors
            </div>
          </Link>

          {/* Right: search + account + hamburger */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <input
              type="search"
              placeholder="Search…"
              className="hidden sm:block h-9 w-56 rounded-lg border border-white/15 bg-white text-[#0a2230] px-3 text-sm outline-none focus:ring-2 focus:ring-[#c8a44d]/40"
            />

            {/* ✅ Only change: perfect circle + correct gold + first/last initials */}
            <AccountCircle
              user={meUser}
              loading={meLoading}
              onClick={() => setOpen(false)}
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
                    {/* ===== TOP ACTIONS (PRIMARY) ===== */}
                    <Link
                      href="/listings"
                      className={navPrimary}
                      onClick={() => setOpen(false)}
                    >
                      <span className={iconBox}>
                        <BinocularsIcon />
                      </span>
                      Browse all Sailboats
                    </Link>

                    <Link
                      href="/listings/new"
                      className={navPrimary}
                      onClick={() => setOpen(false)}
                    >
                      <span className={iconBox}>
                        <DollarIcon />
                      </span>
                      Post a Sailboat Listing
                    </Link>

                    {/* ===== ONLY DIVIDER ===== */}
                    <div className="my-2 h-px bg-white/15" />

                    {/* ===== Keep only Login/Dashboard (remove extra links per request) ===== */}
                    <Link
                      href={meUser ? DASHBOARD_HREF : LOGIN_HREF}
                      className={navSecondary}
                      onClick={() => setOpen(false)}
                    >
                      <span className={iconBox}>
                        {meUser ? (
                          <span className="h-6 w-6 rounded-full bg-white/10 ring-1 ring-white/15 grid place-items-center text-[11px] font-extrabold tracking-wide">
                            {initialsFromUser(meUser)}
                          </span>
                        ) : (
                          <UserIcon />
                        )}
                      </span>
                      {meUser ? "Dashboard" : "Login"}
                    </Link>

                    {/* ===== LOG OUT (only if logged in) ===== */}
                    {meUser && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className={logoutBtn}
                      >
                        <span className={iconBox} aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                          </svg>
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
