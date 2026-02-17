import "server-only";

import { NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="submitalot-admin"' },
  });
}

function decodeBasic(header: string) {
  if (!header.startsWith("Basic ")) return null;
  const encoded = header.slice(6).trim();
  if (!encoded) return null;

  try {
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function getAdminCredentials() {
  const username =
    process.env.ADMIN_BASIC_AUTH_USERNAME || process.env.BASIC_AUTH_USERNAME || "";
  const password =
    process.env.ADMIN_BASIC_AUTH_PASSWORD || process.env.BASIC_AUTH_PASSWORD || "";
  return {
    username: username.trim(),
    password: password.trim(),
  };
}

export function requireAdminAccess(request: Request) {
  const { username, password } = getAdminCredentials();
  const authHeader = request.headers.get("authorization");

  if (process.env.NODE_ENV === "development" && !username && !password) {
    return null;
  }

  if (!username || !password) {
    return NextResponse.json(
      {
        error:
          "Admin credentials are not configured. Set ADMIN_BASIC_AUTH_USERNAME and ADMIN_BASIC_AUTH_PASSWORD.",
      },
      { status: 503 }
    );
  }

  if (!authHeader) return unauthorized();
  const decoded = decodeBasic(authHeader);
  if (!decoded) return unauthorized();

  const separator = decoded.indexOf(":");
  if (separator < 0) return unauthorized();

  const providedUser = decoded.slice(0, separator);
  const providedPass = decoded.slice(separator + 1);

  if (providedUser !== username || providedPass !== password) {
    return unauthorized();
  }

  return null;
}
