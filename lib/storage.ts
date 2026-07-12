/**
 * lib/storage.ts — local-disk media storage abstraction.
 *
 * DEPLOYMENT CONSTRAINT (same single-process assumption as lib/rate-limit.ts):
 * Local-disk storage assumes a SINGLE-PROCESS, PERSISTENT-FILESYSTEM
 * deployment. It will NOT work on ephemeral/serverless filesystems (files
 * vanish between invocations) or across multiple instances (each has its
 * own disk). Revisit before any Vercel/serverless deploy — swap this module
 * for S3/R2/Blob storage; routes that depend on it (upload/serving routes)
 * stay unchanged since they only call putFile/getFile/getStream/statFile.
 *
 * Files are written under a gitignored `uploads/` directory at the project
 * root, sharded by the first 2 hex characters of a crypto-random UUID to
 * avoid thousands of entries in a single directory:
 *   uploads/<ab>/<uuid>.<ext>
 *
 * Keys are NON-guessable (crypto.randomUUID), not sequential IDs, since the
 * `/api/media/[mediaId]` route is the sole authorization boundary — key
 * secrecy adds defense-in-depth. Routes never touch fs/path directly; they
 * only pass/receive opaque keys.
 */

import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export type MediaKind = "PHOTO" | "VIDEO";

export type StoredMeta = {
  type: MediaKind;
  mime: string;
  size: number;
};

// MIME -> extension map. Only allowlisted MIME types ever reach putFile,
// so this map is the single source of truth for extension and, via
// CONTENT_TYPE_BY_EXTENSION, for the Content-Type returned by the serving
// route.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

// Matches "<2 hex chars>/<uuid>.<ext>" — validated before any fs access to
// guard against path traversal via a malformed/tampered key.
const KEY_PATTERN = /^[0-9a-f]{2}\/[0-9a-f-]{36}\.\w+$/;

function assertValidKey(key: string) {
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Invalid storage key");
  }
}

function resolveKeyPath(key: string): string {
  assertValidKey(key);
  return path.join(UPLOADS_DIR, key);
}

export function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop() ?? "";
  return CONTENT_TYPE_BY_EXTENSION[ext] ?? "application/octet-stream";
}

/**
 * Writes bytes to a sharded path under UPLOADS_DIR and returns the opaque
 * key to persist in Media.fileUrl.
 */
export async function putFile(
  bytes: Buffer | Uint8Array,
  meta: StoredMeta
): Promise<{ key: string }> {
  const extension = EXTENSION_BY_MIME[meta.mime];
  if (!extension) {
    throw new Error(`Unsupported MIME type: ${meta.mime}`);
  }

  const uuid = randomUUID();
  const shard = uuid.slice(0, 2);
  const key = `${shard}/${uuid}.${extension}`;
  const filePath = resolveKeyPath(key);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);

  return { key };
}

/** Full buffered read. Throws if the key does not resolve to an existing file. */
export async function getFile(key: string): Promise<Buffer> {
  const filePath = resolveKeyPath(key);
  return readFile(filePath);
}

/** Streaming read for the serving route — avoids buffering whole videos in memory. */
export async function getStream(
  key: string
): Promise<{ stream: ReadableStream; size: number }> {
  const filePath = resolveKeyPath(key);
  const { size } = await stat(filePath);
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return { stream: webStream, size };
}

/** Optional stat lookup, used for rollback/cleanup symmetry. Returns null if missing. */
export async function statFile(key: string): Promise<{ size: number } | null> {
  try {
    const filePath = resolveKeyPath(key);
    const { size } = await stat(filePath);
    return { size };
  } catch {
    return null;
  }
}
