import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TRANSIENT_STATUSES = new Set([502, 503, 504]);
const IDEMPOTENT_AUTH_PATHS = new Set(["auth/demo-login", "auth/login"]);

function resolveBackendBaseUrl(): string {
  const raw = (process.env.INTERNAL_API_URL || "http://backend:8000").trim();
  const normalized = /^https?:\/\//i.test(raw)
    ? raw
    : raw.includes(".onrender.com")
      ? `https://${raw}`
      : `http://${raw}`;
  return normalized.replace(/\/$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUpstream(
  targetUrl: string,
  method: string,
  joinedPath: string,
  headers: Headers,
  bodyBuffer?: ArrayBuffer
): Promise<Response> {
  const isSafeRetry =
    method === "GET" ||
    method === "HEAD" ||
    (method === "POST" && IDEMPOTENT_AUTH_PATHS.has(joinedPath));
  const maxAttempts = isSafeRetry ? 4 : 1;

  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const init: RequestInit = {
        method,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      };
      if (bodyBuffer !== undefined) {
        init.body = bodyBuffer.slice(0);
      }

      const res = await fetch(targetUrl, init);
      lastResponse = res;

      if (!TRANSIENT_STATUSES.has(res.status) || attempt === maxAttempts) {
        return res;
      }
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) {
        throw err;
      }
    }

    await sleep(attempt * 2000);
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("upstream_unreachable");
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const joinedPath = path.join("/");
  const search = request.nextUrl.search || "";
  const targetUrl = `${resolveBackendBaseUrl()}/api/v1/${joinedPath}${search}`;

  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  let bodyBuffer: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    bodyBuffer = await request.arrayBuffer();
  }

  try {
    const upstream = await fetchUpstream(
      targetUrl,
      request.method,
      joinedPath,
      headers,
      bodyBuffer
    );
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers();

    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        detail:
          "El servidor gratuito de Render está encendiendo (puede tardar entre 25 y 50 segundos). Espera un momento y vuelve a intentarlo.",
        error: err instanceof Error ? err.message : "unknown_error",
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}
