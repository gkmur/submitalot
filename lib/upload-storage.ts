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
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export interface StoredUploadMeta {
  id: string;
  originalName: string;
  type: string;
  size: number;
  storedAt: string;
}

const UPLOAD_ROOT = join(process.cwd(), "tmp", "uploads");
const STORAGE_DRIVER = (process.env.UPLOAD_STORAGE_DRIVER ?? "local").toLowerCase();
const RETENTION_HOURS = envInt(process.env.UPLOAD_RETENTION_HOURS, 72);
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = envInt(process.env.UPLOAD_CLEANUP_INTERVAL_MS, 10 * 60 * 1000);

declare global {
  // eslint-disable-next-line no-var
  var __submitalotUploadCleanupAfter: number | undefined;
  // eslint-disable-next-line no-var
  var __submitalotS3Client: S3Client | undefined;
}

interface S3UploadConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  prefix: string;
}

function envInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function ensureStorageDriver() {
  if (STORAGE_DRIVER !== "local" && STORAGE_DRIVER !== "s3") {
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

function getS3Config(): S3UploadConfig {
  const bucket = process.env.S3_BUCKET?.trim() ?? "";
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  const prefix = (process.env.S3_UPLOAD_PREFIX ?? "uploads").replace(/^\/+|\/+$/g, "");

  if (!bucket) throw new Error("S3_BUCKET is required when UPLOAD_STORAGE_DRIVER=s3");
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for s3 upload storage");
  }

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    prefix: prefix || "uploads",
  };
}

function getS3Client() {
  if (globalThis.__submitalotS3Client) {
    return globalThis.__submitalotS3Client;
  }

  const config = getS3Config();
  globalThis.__submitalotS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return globalThis.__submitalotS3Client;
}

function s3ObjectKey(id: string) {
  const config = getS3Config();
  return `${config.prefix}/${id}.bin`;
}

function encodeMetaValue(value: string) {
  return encodeURIComponent(value);
}

function decodeMetaValue(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
}

function isS3NotFoundError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  if (maybe.name === "NoSuchKey" || maybe.name === "NotFound") return true;
  return maybe.$metadata?.httpStatusCode === 404;
}

async function bodyToBuffer(
  body: unknown
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  const withTransform = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof withTransform.transformToByteArray === "function") {
    const bytes = await withTransform.transformToByteArray();
    return Buffer.from(bytes);
  }

  const iterable = body as AsyncIterable<unknown>;
  if (Symbol.asyncIterator in (body as object)) {
    const chunks: Buffer[] = [];
    for await (const chunk of iterable) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        continue;
      }
      if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
        continue;
      }
      if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported S3 body stream type");
}

async function persistUploadLocal(file: File): Promise<StoredUploadMeta> {
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

async function persistUploadS3(file: File): Promise<StoredUploadMeta> {
  const id = randomUUID();
  const meta: StoredUploadMeta = {
    id,
    originalName: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    storedAt: new Date().toISOString(),
  };
  const key = s3ObjectKey(id);
  const config = getS3Config();
  const client = getS3Client();
  const body = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: meta.type,
      Metadata: {
        originalname: encodeMetaValue(meta.originalName),
        storedat: meta.storedAt,
        originaltype: meta.type,
      },
    })
  );

  return meta;
}

export async function persistUpload(file: File): Promise<StoredUploadMeta> {
  ensureStorageDriver();
  if (STORAGE_DRIVER === "s3") {
    return persistUploadS3(file);
  }
  return persistUploadLocal(file);
}

function loadUploadLocal(id: string): { buffer: Buffer; meta: StoredUploadMeta } | null {
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

async function loadUploadS3(id: string): Promise<{ buffer: Buffer; meta: StoredUploadMeta } | null> {
  if (!isValidUploadId(id)) return null;

  const config = getS3Config();
  const client = getS3Client();
  const key = s3ObjectKey(id);

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );

    const buffer = await bodyToBuffer(result.Body);
    const originalName = decodeMetaValue(result.Metadata?.originalname, "upload.bin");
    const type = result.ContentType || result.Metadata?.originaltype || "application/octet-stream";
    const storedAt = result.Metadata?.storedat || new Date().toISOString();
    const size = typeof result.ContentLength === "number" ? result.ContentLength : buffer.length;

    return {
      buffer,
      meta: {
        id,
        originalName,
        type,
        size,
        storedAt,
      },
    };
  } catch (err) {
    if (isS3NotFoundError(err)) return null;
    throw err;
  }
}

export async function loadUpload(id: string): Promise<{ buffer: Buffer; meta: StoredUploadMeta } | null> {
  ensureStorageDriver();
  if (STORAGE_DRIVER === "s3") {
    return loadUploadS3(id);
  }
  return loadUploadLocal(id);
}

function maybeCleanupExpiredUploads() {
  if (STORAGE_DRIVER !== "local") return;

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
