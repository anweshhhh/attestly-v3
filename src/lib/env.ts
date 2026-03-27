import path from "node:path";

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown"
]);

export const BlobStorageBackend = {
  VERCEL_BLOB: "vercel-blob",
  MOCK: "mock"
} as const;

type RuntimeEnv = NodeJS.ProcessEnv;
type BlobStorageBackend = (typeof BlobStorageBackend)[keyof typeof BlobStorageBackend];

const DEFAULT_DEV_AUTH_SECRET = "dev-attestly-v3-auth-secret";

function isProductionRuntime(env: RuntimeEnv) {
  return env.NODE_ENV === "production";
}

function getEnvValue(env: RuntimeEnv, keys: string[]) {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function isPostgresConnectionString(value: string) {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

export function getAuthSecret(env: RuntimeEnv = process.env) {
  const value = getEnvValue(env, ["AUTH_SECRET", "NEXTAUTH_SECRET"]);
  if (value) {
    return value;
  }
  if (isProductionRuntime(env)) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required.");
  }
  return DEFAULT_DEV_AUTH_SECRET;
}

export function getGoogleClientId(env: RuntimeEnv = process.env) {
  const value = env.GOOGLE_CLIENT_ID?.trim();
  if (!value) {
    throw new Error("GOOGLE_CLIENT_ID is required.");
  }
  return value;
}

export function getGoogleClientSecret(env: RuntimeEnv = process.env) {
  const value = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!value) {
    throw new Error("GOOGLE_CLIENT_SECRET is required.");
  }
  return value;
}

export function getDatabaseUrl(env: RuntimeEnv = process.env) {
  const value = env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }
  if (!isPostgresConnectionString(value)) {
    throw new Error("DATABASE_URL must be a Postgres connection string.");
  }
  return value;
}

export function getDirectDatabaseUrl(env: RuntimeEnv = process.env) {
  const value = getEnvValue(env, ["DIRECT_DATABASE_URL", "DATABASE_DIRECT_URL"]);
  if (!value) {
    return null;
  }
  if (!isPostgresConnectionString(value)) {
    throw new Error("DIRECT_DATABASE_URL must be a Postgres connection string.");
  }
  return value;
}

export function getOpenAIApiKey(env: RuntimeEnv = process.env) {
  const value = env.OPENAI_API_KEY?.trim();
  if (!value) {
    throw new Error("OPENAI_API_KEY is required.");
  }
  return value;
}

export function getOpenAIChatModel(env: RuntimeEnv = process.env) {
  return env.OPENAI_CHAT_MODEL?.trim() || "gpt-4.1-mini";
}

export function getBlobReadWriteToken(env: RuntimeEnv = process.env) {
  return getEnvValue(env, ["BLOB_READ_WRITE_TOKEN", "VERCEL_BLOB_READ_WRITE_TOKEN"]);
}

export function getBlobStorageBackend(env: RuntimeEnv = process.env): BlobStorageBackend {
  const configured = env.BLOB_STORAGE_BACKEND?.trim();
  if (configured === BlobStorageBackend.MOCK || configured === BlobStorageBackend.VERCEL_BLOB) {
    return configured;
  }
  if (configured) {
    throw new Error("BLOB_STORAGE_BACKEND must be 'mock' or 'vercel-blob'.");
  }
  if (isProductionRuntime(env)) {
    return BlobStorageBackend.VERCEL_BLOB;
  }
  return getBlobReadWriteToken(env) ? BlobStorageBackend.VERCEL_BLOB : BlobStorageBackend.MOCK;
}

export function getBlobMockRoot(env: RuntimeEnv = process.env) {
  const configured = env.BLOB_MOCK_ROOT?.trim();
  if (!configured) {
    return path.join(process.cwd(), ".blob-mock");
  }
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

export function assertServerRuntimeEnv(env: RuntimeEnv = process.env) {
  getDatabaseUrl(env);
  getAuthSecret(env);
  getGoogleClientId(env);
  getGoogleClientSecret(env);

  if (getBlobStorageBackend(env) === BlobStorageBackend.VERCEL_BLOB && !getBlobReadWriteToken(env)) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required when using Vercel Blob.");
  }

  return true;
}
