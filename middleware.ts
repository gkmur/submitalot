import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="submitalot"' },
  });
}

function shouldBypassAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/upload/") && (request.method === "GET" || request.method === "HEAD")) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const authEnabled = process.env.NODE_ENV !== "development" && Boolean(username && password);

  if (!authEnabled || shouldBypassAuth(request)) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authorization.slice(6).trim();
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return unauthorized();

  const providedUser = decoded.slice(0, separator);
  const providedPass = decoded.slice(separator + 1);

  if (providedUser !== username || providedPass !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
