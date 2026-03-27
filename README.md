# Attestly V3

Attestly V3 is the minimal questionnaire-first rebuild:

- Google sign-in and workspace bootstrap
- evidence upload and parsing for PDF, TXT, and Markdown
- questionnaire CSV import
- grounded autofill with citations
- approved-answer reuse with stale evidence protection
- review and export back into CSV

## Stack

- Next.js 14 App Router
- TypeScript
- Prisma + Postgres + `pgvector`
- Auth.js / NextAuth with Google OAuth
- Vercel Blob for evidence file storage
- OpenAI embeddings + grounded answering

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`
3. Start Postgres with the `vector` extension available
4. Apply schema: `npm run db:push` for local setup or `prisma migrate deploy` for managed environments
5. Start the app: `npm run dev`

## Required environment variables

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`

## Build and deploy

- Local production build: `npm run build`
- Vercel build command: `npm run build:vercel`
- Production storage should use `BLOB_STORAGE_BACKEND=vercel-blob`

## Current surface

- `/`
- `/login`
- `/w/[workspaceSlug]`
- `/w/[workspaceSlug]/evidence`
- `/w/[workspaceSlug]/questionnaires`
- `/w/[workspaceSlug]/questionnaires/[questionnaireId]`
