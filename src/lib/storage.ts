import fs from "node:fs/promises";
import path from "node:path";
import { get, head, put } from "@vercel/blob";
import { BlobStorageBackend, getBlobMockRoot, getBlobStorageBackend } from "@/lib/env";

export type StoredEvidenceObject = {
  pathname: string;
  size: number;
  contentType: string;
  url: string | null;
};

async function readWebStreamToBuffer(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream);
  return Buffer.from(await response.arrayBuffer());
}

function getMockBlobFilePath(pathnameValue: string) {
  return path.join(getBlobMockRoot(), pathnameValue);
}

async function putMockBlob(params: { pathname: string; bytes: Buffer; contentType: string }): Promise<StoredEvidenceObject> {
  const filePath = getMockBlobFilePath(params.pathname);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, params.bytes);

  return {
    pathname: params.pathname,
    size: params.bytes.byteLength,
    contentType: params.contentType,
    url: `mock://${params.pathname}`
  };
}

async function headMockBlob(pathnameValue: string): Promise<StoredEvidenceObject> {
  const filePath = getMockBlobFilePath(pathnameValue);
  const stats = await fs.stat(filePath);

  return {
    pathname: pathnameValue,
    size: Number(stats.size),
    contentType: "application/octet-stream",
    url: `mock://${pathnameValue}`
  };
}

async function getMockBlob(pathnameValue: string) {
  const filePath = getMockBlobFilePath(pathnameValue);
  return fs.readFile(filePath);
}

export async function putStoredEvidenceObject(params: {
  pathname: string;
  bytes: Buffer;
  contentType: string;
}): Promise<StoredEvidenceObject> {
  if (getBlobStorageBackend() === BlobStorageBackend.MOCK) {
    return putMockBlob(params);
  }

  const blob = await put(params.pathname, params.bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: params.contentType
  });

  return {
    pathname: blob.pathname,
    size: params.bytes.byteLength,
    contentType: blob.contentType,
    url: blob.url
  };
}

export async function headStoredEvidenceObject(pathnameValue: string): Promise<StoredEvidenceObject> {
  if (getBlobStorageBackend() === BlobStorageBackend.MOCK) {
    return headMockBlob(pathnameValue);
  }

  const blob = await head(pathnameValue);
  return {
    pathname: blob.pathname,
    size: blob.size,
    contentType: blob.contentType,
    url: blob.url
  };
}

export async function readStoredEvidenceBytes(pathnameValue: string) {
  if (getBlobStorageBackend() === BlobStorageBackend.MOCK) {
    return getMockBlob(pathnameValue);
  }

  const result = await get(pathnameValue, {
    access: "private",
    useCache: false
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Stored evidence file could not be loaded.");
  }

  return readWebStreamToBuffer(result.stream);
}
