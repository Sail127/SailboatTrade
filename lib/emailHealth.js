import { resolveTxt } from "node:dns/promises";
import prisma from "@/lib/prisma";

function normalize(value) {
  return String(value || "").trim();
}

function parseMailboxAddress(value) {
  const raw = normalize(value);
  const match = raw.match(/<([^>]+)>/);
  return normalize(match?.[1] || raw).toLowerCase();
}

function domainFromEmail(value) {
  const email = parseMailboxAddress(value);
  return email.includes("@") ? email.split("@")[1].toLowerCase() : "";
}

function rootDomainFromDomain(domain) {
  const parts = normalize(domain).split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

async function resendFetch(path) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const res = await fetch(`https://api.resend.com${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    cache: "no-store",
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.message || payload?.error || `Resend request failed (${res.status}).`);
  }
  return payload;
}

async function lookupDmarc(domain) {
  const host = `_dmarc.${domain}`;
  try {
    const records = await resolveTxt(host);
    const flattened = records.map((parts) => parts.join("")).filter(Boolean);
    return {
      host,
      ok: flattened.length > 0,
      value: flattened[0] || "",
    };
  } catch {
    return {
      host,
      ok: false,
      value: "",
    };
  }
}

export async function getEmailHealthSnapshot() {
  const fromEmail = parseMailboxAddress(
    process.env.RESEND_FROM ||
      process.env.EMAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.NOTIFICATIONS_FROM ||
      "",
  );

  const sendingDomain = domainFromEmail(fromEmail);
  const rootDomain = rootDomainFromDomain(sendingDomain);

  const domains = await resendFetch("/domains");
  const matched = Array.isArray(domains?.data)
    ? domains.data.find((item) => normalize(item?.name).toLowerCase() === sendingDomain)
    : null;

  const domainDetail = matched?.id ? await resendFetch(`/domains/${matched.id}`) : null;
  const emails = await resendFetch("/emails?limit=100");
  const recentEmails = Array.isArray(emails?.data) ? emails.data : [];

  const summary = recentEmails.reduce(
    (acc, item) => {
      const event = normalize(item?.last_event).toLowerCase() || "unknown";
      acc.total += 1;
      acc.byEvent[event] = (acc.byEvent[event] || 0) + 1;
      if (event === "delivered") acc.delivered += 1;
      else acc.nonDelivered += 1;
      return acc;
    },
    { total: 0, delivered: 0, nonDelivered: 0, byEvent: {} },
  );

  const problematicEvents = recentEmails
    .filter((item) => normalize(item?.last_event).toLowerCase() !== "delivered")
    .slice(0, 25)
    .map((item) => ({
      id: item.id || "",
      to: Array.isArray(item.to) ? item.to : [],
      from: item.from || "",
      subject: item.subject || "",
      createdAt: item.created_at || null,
      lastEvent: item.last_event || "unknown",
    }));

  const dmarc = sendingDomain ? await lookupDmarc(sendingDomain) : { host: "", ok: false, value: "" };
  const webhookEvents = await prisma.emailDeliveryEvent.findMany({
    where: { provider: "resend" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const recentWebhookEvents = webhookEvents.map((event) => ({
    id: event.id,
    providerEventId: event.providerEventId,
    providerMessageId: event.providerMessageId,
    eventType: event.eventType,
    sender: event.sender,
    recipient: event.recipient,
    subject: event.subject,
    occurredAt: event.occurredAt,
    createdAt: event.createdAt,
  }));
  const webhookProblematicEvents = recentWebhookEvents.filter((event) => {
    const normalized = normalize(event.eventType).toLowerCase();
    return normalized && normalized !== "delivered";
  });

  return {
    generatedAt: new Date().toISOString(),
    fromEmail,
    sendingDomain,
    rootDomain,
    domain: domainDetail
      ? {
          id: domainDetail.id,
          name: domainDetail.name,
          status: domainDetail.status,
          region: domainDetail.region,
          capabilities: domainDetail.capabilities || {},
          records: Array.isArray(domainDetail.records) ? domainDetail.records : [],
        }
      : null,
    dmarc,
    recentEmails: recentEmails.slice(0, 25).map((item) => ({
      id: item.id || "",
      to: Array.isArray(item.to) ? item.to : [],
      from: item.from || "",
      subject: item.subject || "",
      createdAt: item.created_at || null,
      lastEvent: item.last_event || "unknown",
    })),
    summary,
    problematicEvents,
    recentWebhookEvents,
    webhookProblematicEvents,
  };
}
