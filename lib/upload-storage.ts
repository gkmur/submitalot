import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

export interface StoredUploadMeta {
  id: string;
  originalName: string;
  type: string;
  size: number;
  storedAt: string;
}

const UPLOAD_ROOT = join(process.cwd(), "tmp", "uploads");
const STORAGE_DRIVER = process.env.UPLOAD_STORAGE_DRIVER ?? "local";
const RETENTION_HOURS = envInt(process.env.UPLOAD_RETENTION_HOURS, 72);
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = envInt(process.env.UPLOAD_CLEANUP_INTERVAL_MS, 10 * 60 * 1000);

declare global {
  // eslint-disable-next-line no-var
  var __submitalotUploadCleanupAfter: number | undefined;
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function assertStorageDriver() {
  if (STORAGE_DRIVER !== "local") {
    throw new Error(`Unsupported UPLOAD_STORAGE_DRIVER: ${STORAGE_DRIVER}`);
  }
}

function ensureUploadRoot() {
  mkdirSync(UPLOAD_ROOT, { recursive: true });
}

function toPaths(id: string) {
  return {
    filePath: join(UPLOAD_ROOT, `${id}.bin`),
    metaPath: join(UPLOAD_ROOT, `${id}.json`),
  };
}

export function isValidUploadId(id: string) {
  return /^[a-f0-9-]{36}$/.test(id);
}

export function uploadPathForId(id: string) {
  return `/api/upload/${id}`;
}

export function buildUploadUrl(origin: string, id: string) {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return `${normalizedOrigin}${uploadPathForId(id)}`;
}

export function isTrustedUploadUrl(urlValue: string, expectedOrigin: string) {
  try {
    const normalizedOrigin = new URL(expectedOrigin).origin;
    const parsed = new URL(urlValue);
    if (parsed.origin !== normalizedOrigin) return false;
    if (parsed.username || parsed.password) return false;

    const match = parsed.pathname.match(/^\/api\/upload\/([a-f0-9-]{36})$/);
    if (!match) return false;
    return isValidUploadId(match[1]);
  } catch {
    return false;
  }
}

export async function persistUpload(file: File): Promise<StoredUploadMeta> {
  assertStorageDriver();
  maybeCleanupExpiredUploads();
  ensureUploadRoot();

  const id = randomUUID();
  const { filePath, metaPath } = toPaths(id);

  const buffer = Buffer.from(await file.arrayBuffer());
  const meta: StoredUploadMeta = {
    id,
    originalName: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    storedAt: new Date().toISOString(),
  };

  writeFileSync(filePath, buffer);
  writeFileSync(metaPath, JSON.stringify(meta), "utf-8");
  return meta;
}

export function loadUpload(id: string): { buffer: Buffer; meta: StoredUploadMeta } | null {
  assertStorageDriver();
  maybeCleanupExpiredUploads();
  if (!isValidUploadId(id)) return null;

  const { filePath, metaPath } = toPaths(id);
  if (!existsSync(filePath) || !existsSync(metaPath)) return null;

  try {
    const buffer = readFileSync(filePath);
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as StoredUploadMeta;
    return { buffer, meta };
  } catch {
    return null;
  }
}

function maybeCleanupExpiredUploads() {
  const current = Date.now();
  if (
    globalThis.__submitalotUploadCleanupAfter &&
    globalThis.__submitalotUploadCleanupAfter > current
  ) {
    return;
  }

  globalThis.__submitalotUploadCleanupAfter = current + CLEANUP_INTERVAL_MS;
  cleanupExpiredUploads(current);
}

function cleanupExpiredUploads(current: number) {
  if (!existsSync(UPLOAD_ROOT)) return;

  const entries = readdirSync(UPLOAD_ROOT);
  for (const name of entries) {
    const fullPath = join(UPLOAD_ROOT, name);
    const staleByMtime = isOlderThanRetention(fullPath, current);

    if (name.endsWith(".json")) {
      const id = name.slice(0, -5);
      const metaPath = fullPath;
      const filePath = join(UPLOAD_ROOT, `${id}.bin`);

      let staleByMeta = false;
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as StoredUploadMeta;
        const storedAt = new Date(meta.storedAt).getTime();
        staleByMeta = Number.isFinite(storedAt) && current - storedAt > RETENTION_MS;
      } catch {
        staleByMeta = staleByMtime;
      }

      if (staleByMeta || staleByMtime) {
        safeRemove(filePath);
        safeRemove(metaPath);
      }
      continue;
    }

    if (name.endsWith(".bin") && staleByMtime) {
      const id = name.slice(0, -4);
      safeRemove(fullPath);
      safeRemove(join(UPLOAD_ROOT, `${id}.json`));
    }
  }
}

function isOlderThanRetention(path: string, current: number) {
  try {
    const stats = statSync(path);
    return current - stats.mtimeMs > RETENTION_MS;
  } catch {
    return true;
  }
}

function safeRemove(path: string) {
  try {
    rmSync(path, { force: true });
  } catch {
    // ignore cleanup errors
  }
}
