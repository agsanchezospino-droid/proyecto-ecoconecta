import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveBackendBaseUrl(): string {
  const raw = (process.env.INTERNAL_API_URL || "http://backend:8000").trim();
  const normalized = /^https?:\/\//i.test(raw)
    ? raw
    : raw.includes(".onrender.com")
      ? `https://${raw}`
      : `http://${raw}`;
  return normalized.replace(/\/$/, "");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.search || "";
  const targetUrl = `${resolveBackendBaseUrl()}/api/webhooks/twilio-whatsapp${search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const twilioSig = request.headers.get("x-twilio-signature");
  if (twilioSig) {
    headers.set("x-twilio-signature", twilioSig);
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
      cache: "no-store",
    });
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }
    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        detail: "No se pudo reenviar el webhook de Twilio WhatsApp al backend.",
        error: err instanceof Error ? err.message : "unknown_error",
      },
      { status: 502 }
    );
  }
}
