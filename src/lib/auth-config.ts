import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { AUTH_SESSION_MAX_AGE_SECONDS, getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/env";
import { ensureUserIdentity } from "@/lib/workspaces";

type VerifiedIdentity = {
  email: string;
  name: string | null;
};

export function getVerifiedGoogleIdentity(profile: Record<string, unknown> | null | undefined): VerifiedIdentity | null {
  const email = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
  const emailVerified = profile?.email_verified === true;

  if (!email || !emailVerified) {
    return null;
  }

  return {
    email,
    name: typeof profile?.name === "string" && profile.name.trim() ? profile.name.trim() : null
  };
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    GoogleProvider({
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret()
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      const identity = getVerifiedGoogleIdentity(profile as Record<string, unknown> | undefined);
      if (!identity) {
        return false;
      }

      await ensureUserIdentity(identity);
      return true;
    },
    async jwt({ token, account, profile }) {
      const shouldRefreshIdentity = account?.provider === "google" || typeof token.appUserId !== "string";
      if (!shouldRefreshIdentity) {
        return token;
      }

      const identity =
        account?.provider === "google"
          ? getVerifiedGoogleIdentity(profile as Record<string, unknown> | undefined)
          : typeof token.email === "string" && token.email.trim()
            ? {
                email: token.email.trim().toLowerCase(),
                name: typeof token.name === "string" && token.name.trim() ? token.name : null
              }
            : null;

      if (!identity) {
        return token;
      }

      const user = await ensureUserIdentity(identity);
      token.appUserId = user.id;
      token.email = user.email;
      token.name = user.name ?? null;
      return token;
    },
    async session({ session, token }) {
      if (!session.user || typeof token.appUserId !== "string" || typeof token.email !== "string") {
        return session;
      }

      session.user.id = token.appUserId;
      session.user.email = token.email;
      session.user.name = typeof token.name === "string" ? token.name : null;
      return session;
    }
  }
};
