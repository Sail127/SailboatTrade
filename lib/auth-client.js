// lib/auth-client.js
"use client";

const CHANNEL = "sbt_auth";

export function notifyAuthChanged() {
  try {
    // ✅ best: instant across tabs/windows
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CHANNEL);
      bc.postMessage({ type: "AUTH_CHANGED", ts: Date.now() });
      bc.close();
    }
  } catch {
    // ignore
  }

  try {
    // ✅ fallback: triggers "storage" event in other tabs
    localStorage.setItem("sbt_auth_changed", String(Date.now()));
  } catch {
    // ignore
  }
}

export function onAuthChanged(cb) {
  let bc;

  function handler() {
    cb?.();
  }

  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (e) => {
        if (e?.data?.type === "AUTH_CHANGED") handler();
      };
    }
  } catch {
    // ignore
  }

  function onStorage(e) {
    if (e.key === "sbt_auth_changed") handler();
  }

  window.addEventListener("storage", onStorage);

  // return cleanup
  return () => {
    window.removeEventListener("storage", onStorage);
    try {
      if (bc) bc.close();
    } catch {
      // ignore
    }
  };
}
