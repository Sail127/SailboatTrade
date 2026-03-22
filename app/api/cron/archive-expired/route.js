// app/api/cron/archive-expired/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  notifyOwnerListingExpired,
  notifyOwnerListingRenewalReminder,
} from "@/lib/adminReviewNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENEWAL_REMINDER_WINDOW_DAYS = 5;

function startOfUtcDay(date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function daysUntilExpiration(now, expiresAt) {
  return Math.round(
    (startOfUtcDay(new Date(expiresAt)) - startOfUtcDay(new Date(now))) /
      (24 * 60 * 60 * 1000),
  );
}

function sentToday(sentAt, now) {
  if (!sentAt) return false;
  return startOfUtcDay(new Date(sentAt)) === startOfUtcDay(new Date(now));
}

export async function GET(req) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  const expected = String(process.env.CRON_SECRET || "").trim();

  if (!isVercelCron && (!expected || secret !== expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();
    const reminderSearchUpperBound = new Date(
      now.getTime() + (RENEWAL_REMINDER_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000,
    );

    const reminderCandidates = await prisma.listing.findMany({
      where: {
        status: "PUBLISHED",
        expiresAt: {
          not: null,
          gt: now,
          lte: reminderSearchUpperBound,
        },
      },
      select: {
        id: true,
        expiresAt: true,
        renewalReminderLastSentAt: true,
      },
    });

    let remindersSent = 0;
    for (const listing of reminderCandidates) {
      if (!listing.expiresAt) continue;

      const daysRemaining = daysUntilExpiration(now, listing.expiresAt);
      if (daysRemaining < 1 || daysRemaining > RENEWAL_REMINDER_WINDOW_DAYS) continue;
      if (sentToday(listing.renewalReminderLastSentAt, now)) continue;

      const result = await notifyOwnerListingRenewalReminder({
        req,
        listingId: listing.id,
        daysRemaining,
        source: "api/cron/archive-expired",
      });

      if (!result?.ok) {
        console.warn("[archive-expired cron] renewal reminder not sent", {
          listingId: listing.id,
          daysRemaining,
          reason: result?.skipped || result?.error || "unknown",
        });
        continue;
      }

      await prisma.listing.update({
        where: { id: listing.id },
        data: { renewalReminderLastSentAt: now },
      });
      remindersSent += 1;
    }

    const expiredEmailCandidates = await prisma.listing.findMany({
      where: {
        status: { in: ["PUBLISHED", "ARCHIVED"] },
        expiresAt: { not: null, lt: now },
        expiredEmailSentAt: null,
      },
      select: {
        id: true,
      },
    });

    let expiredEmailsSent = 0;
    for (const listing of expiredEmailCandidates) {
      const result = await notifyOwnerListingExpired({
        req,
        listingId: listing.id,
        source: "api/cron/archive-expired",
      });

      if (!result?.ok) {
        console.warn("[archive-expired cron] expired notice not sent", {
          listingId: listing.id,
          reason: result?.skipped || result?.error || "unknown",
        });
        continue;
      }

      await prisma.listing.update({
        where: { id: listing.id },
        data: { expiredEmailSentAt: now },
      });
      expiredEmailsSent += 1;
    }

    const archived = await prisma.listing.updateMany({
      where: {
        status: "PUBLISHED",
        expiresAt: { not: null, lt: now },
      },
      data: {
        status: "ARCHIVED",
        featuredHome: false,
        archivedAt: now,
      },
    });

    return NextResponse.json({
      ok: true,
      now: now.toISOString(),
      remindersSent,
      expiredEmailsSent,
      archived: archived.count,
    });
  } catch (e) {
    console.error("cron/archive-expired failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Cron failed." }, { status: 500 });
  }
}
