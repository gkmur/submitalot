import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized(realm = "submitalot") {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}"` },
  });
}

function shouldBypassAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/upload/") && (request.method === "GET" || request.method === "HEAD")) {
    return true;
  }

  return false;
}

function getCredentialsForPath(pathname: string) {
  const basicUsername = process.env.BASIC_AUTH_USERNAME?.trim() || "";
  const basicPassword = process.env.BASIC_AUTH_PASSWORD?.trim() || "";
  const adminUsername =
    process.env.ADMIN_BASIC_AUTH_USERNAME?.trim() || basicUsername;
  const adminPassword =
    process.env.ADMIN_BASIC_AUTH_PASSWORD?.trim() || basicPassword;

  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin/");

  if (isAdminPath) {
    return {
      username: adminUsername,
      password: adminPassword,
      realm: "submitalot-admin",
    };
  }

  return {
    username: basicUsername,
    password: basicPassword,
    realm: "submitalot",
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const credentials = getCredentialsForPath(pathname);
  const authEnabled =
    process.env.NODE_ENV !== "development" &&
    Boolean(credentials.username && credentials.password);

  if (!authEnabled || shouldBypassAuth(request)) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Basic ")) {
    return unauthorized(credentials.realm);
  }

  const encoded = authorization.slice(6).trim();
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized(credentials.realm);
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return unauthorized(credentials.realm);

  const providedUser = decoded.slice(0, separator);
  const providedPass = decoded.slice(separator + 1);

  if (
    providedUser !== credentials.username ||
    providedPass !== credentials.password
  ) {
    return unauthorized(credentials.realm);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
