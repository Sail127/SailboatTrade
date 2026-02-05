import { readSession } from "@/lib/auth";
export async function GET() {
  const s = await readSession();
  return Response.json({ ok: true, user: s?.uid ? s : null });
}
