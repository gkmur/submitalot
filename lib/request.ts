type HeaderSource = Pick<Headers, "get">;

export function getClientIp(headers: HeaderSource): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "unknown";
}

export function getRequestOrigin(headers: HeaderSource, fallbackUrl?: string): string {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const forwardedHost = headers.get("x-forwarded-host")?.trim();
  const forwardedProto = headers.get("x-forwarded-proto")?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }

  const host = headers.get("host")?.trim();
  if (host) {
    const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  if (fallbackUrl) {
    return new URL(fallbackUrl).origin;
  }

  throw new Error("Unable to determine request origin");
}
