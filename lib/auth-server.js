// lib/auth-server.js
import { requireUser } from "@/lib/auth";

/**
 * Safe wrapper around requireUser() for API routes.
 * Returns session payload (e.g. { uid, email, name }) or null.
 */
export async function getSessionOrNull() {
  return await requireUser().catch(() => null);
}
