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

async function forwardWebhook(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.search || "";
  const targetUrl = `${resolveBackendBaseUrl()}/api/webhooks/whatsapp${search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const hubSignature = request.headers.get("x-hub-signature-256");
  if (hubSignature) {
    headers.set("x-hub-signature-256", hubSignature);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);
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
        detail: "No se pudo reenviar el webhook de WhatsApp al backend.",
        error: err instanceof Error ? err.message : "unknown_error",
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return forwardWebhook(request);
}

export async function POST(request: NextRequest) {
  return forwardWebhook(request);
}
