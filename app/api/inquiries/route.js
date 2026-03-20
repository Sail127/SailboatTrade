// app/api/inquiries/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAppUrl, sendEmail } from "@/lib/email";
import {
  buildBuyerInquiryConfirmationMessage,
  buildSellerInquiryMessage,
} from "@/lib/email/templates";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { clampStr, hasFilledHoneypot, isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

export async function POST(req) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    }

    const rl = rateLimit({
      key: makeRateLimitKey(req, "public_inquiries"),
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many messages sent. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => null);
    if (hasFilledHoneypot(body, "website")) {
      return NextResponse.json({
        ok: true,
        message: "Thank you for your interest. The seller has been notified.",
      });
    }

    const listingId = String(body?.listingId || "").trim();
    const name = clampStr(body?.name || "", 120).trim();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const phone = clampStr(body?.phone || "", 40).trim();
    const message = clampStr(body?.message || "", 2000).trim();

    if (!listingId || !name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        listingContactName: true,
        brokerageName: true,
        contactEmail: true,
        owner: {
          select: {
            email: true,
            deletedAt: true,
            isDisabled: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
      );
    }

    const ownerEmail =
      listing.owner && !listing.owner.deletedAt && !listing.owner.isDisabled
        ? String(listing.owner.email || "").trim()
        : "";

    const sellerEmail = String(listing.contactEmail || ownerEmail || "").trim();
    if (!sellerEmail || !isValidEmail(sellerEmail)) {
      return NextResponse.json(
        { ok: false, error: "Seller contact email is unavailable." },
        { status: 400 }
      );
    }

    const listingTitle = String(listing.title || "Listing").trim();
    const sellerName = String(
      listing.listingContactName || listing.brokerageName || "Seller"
    ).trim();
    const appUrl = getAppUrl(req);
    const listingUrl = `${appUrl}/listings/${encodeURIComponent(listing.id)}`;

    const sellerMessage = buildSellerInquiryMessage({
      appUrl,
      listingTitle,
      listingUrl,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone || "Not provided",
      message,
    });

    const buyerConfirmation = buildBuyerInquiryConfirmationMessage({
      appUrl,
      buyerName: name,
      sellerName,
      listingTitle,
      listingUrl,
    });

    await Promise.all([
      sendEmail({
        to: sellerEmail,
        subject: sellerMessage.subject,
        replyTo: email,
        html: sellerMessage.html,
        text: sellerMessage.text,
        headers: {
          Importance: "high",
          "X-Priority": "1",
          Priority: "urgent",
          "X-MSMail-Priority": "High",
        },
        tags: [{ name: "type", value: "listing_inquiry_seller" }],
      }),
      sendEmail({
        to: email,
        subject: buyerConfirmation.subject,
        html: buyerConfirmation.html,
        text: buyerConfirmation.text,
        tags: [{ name: "type", value: "listing_inquiry_buyer_confirmation" }],
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Thank you for your interest. The seller has been notified.",
    });
  } catch (e) {
    console.error("POST /api/inquiries error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
