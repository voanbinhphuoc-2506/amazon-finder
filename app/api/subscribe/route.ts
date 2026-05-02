import { createHash } from "crypto";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function waitlistLogFingerprint(email: string): string {
  return createHash("sha256").update(email, "utf8").digest("hex").slice(0, 10);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { email?: unknown }).email !== "string"
  ) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const email = (body as { email: string }).email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "amazon-finder-waitlist" }),
      });
    } catch {
      return NextResponse.json({ error: "Webhook failed" }, { status: 502 });
    }
  } else {
    const fp = waitlistLogFingerprint(email);
    console.info(
      `[waitlist] submission received fingerprint=${fp} env=${process.env.NODE_ENV ?? "unknown"} (set WAITLIST_WEBHOOK_URL to forward elsewhere)`,
    );
  }

  return NextResponse.json({ ok: true });
}
