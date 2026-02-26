// app/api/inquiries/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAppUrl, sendEmail } from "@/lib/email";
import { makeRateLimitKey, rateLimit } from "@/lib/rateLimit";
import { clampStr, hasFilledHoneypot, isTrustedOrigin } from "@/lib/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function esc(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

    const nameSafe = esc(name);
    const emailSafe = esc(email);
    const phoneSafe = phone ? esc(phone) : "Not provided";
    const messageSafe = esc(message).replaceAll("\n", "<br/>");
    const listingTitleSafe = esc(listingTitle);
    const sellerNameSafe = esc(sellerName);
    const listingUrlSafe = esc(listingUrl);

    await Promise.all([
      sendEmail({
        to: sellerEmail,
        subject: `New buyer inquiry for ${listingTitle} - SailboatTrade`,
        replyTo: email,
        html: `
          <div style="font-family: Arial, sans-serif; line-height:1.5;">
            <h2 style="margin:0 0 10px;">New inquiry for ${listingTitleSafe}</h2>
            <p style="margin:0 0 12px;">You received a new message from an interested buyer.</p>
            <p style="margin:0 0 8px;"><strong>Buyer name:</strong> ${nameSafe}</p>
            <p style="margin:0 0 8px;"><strong>Buyer email:</strong> <a href="mailto:${emailSafe}">${emailSafe}</a></p>
            <p style="margin:0 0 8px;"><strong>Buyer phone:</strong> ${phoneSafe}</p>
            <p style="margin:12px 0 6px;"><strong>Message:</strong></p>
            <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc;">${messageSafe}</div>
            <p style="margin:14px 0 0;">
              <a href="${listingUrlSafe}" style="display:inline-block;background:#0a2230;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
                View Listing
              </a>
            </p>
          </div>
        `,
        text: `New inquiry for ${listingTitle}\n\nBuyer name: ${name}\nBuyer email: ${email}\nBuyer phone: ${phone || "Not provided"}\n\nMessage:\n${message}\n\nListing: ${listingUrl}`,
        tags: [{ name: "type", value: "listing_inquiry_seller" }],
      }),
      sendEmail({
        to: email,
        subject: `Thanks for your interest in ${listingTitle} - SailboatTrade`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height:1.5;">
            <h2 style="margin:0 0 10px;">Thank you for your interest</h2>
            <p style="margin:0 0 12px;">Hi ${nameSafe},</p>
            <p style="margin:0 0 12px;">Your message has been sent. ${sellerNameSafe} has been notified about your interest in ${listingTitleSafe}.</p>
            <p style="margin:14px 0 0;">
              <a href="${listingUrlSafe}" style="display:inline-block;background:#c8a44d;color:#0a2230;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
                View Listing
              </a>
            </p>
          </div>
        `,
        text: `Thank you for your interest. ${sellerName} has been notified about ${listingTitle}.\n\nView listing: ${listingUrl}`,
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
