import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@communiculture/db";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import bcrypt from "bcryptjs";
import { createTransport } from "nodemailer";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any) as any,
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    ...(process.env.EMAIL_SERVER ? [EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM ?? "Communiculture <noreply@communiculture.com>",
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const subject = "sign in to communiculture";
        const text = `sign in to communiculture\n\n${url}\n\nthis link expires in 24 hours and can only be used once.`;
        const html = `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px">
              <p style="font-size:13px;color:#0083FF;letter-spacing:0.05em;margin:0 0 24px">COMMUNICULTURE</p>
              <h1 style="font-size:28px;font-weight:400;color:#1a1a1a;margin:0 0 24px;line-height:1.2">sign in</h1>
              <p style="font-size:14px;color:#555;margin:0 0 32px;line-height:1.6">
                click the button below to sign in. this link expires in 24 hours.
              </p>
              <a href="${url}" style="display:inline-block;background:#0083FF;color:white;text-decoration:none;padding:10px 24px;border-radius:999px;font-size:14px;letter-spacing:0.04em">
                sign in →
              </a>
              <p style="font-size:12px;color:#999;margin:32px 0 0;line-height:1.6">
                if you didn't request this, you can ignore this email.
              </p>
            </div>
          `;

        // Prefer Resend's HTTP API. Railway (and most PaaS) block outbound SMTP
        // ports, which makes nodemailer's connection hang — so SMTP silently
        // never completes. The HTTP API isn't affected. The key is taken from
        // RESEND_API_KEY, or parsed from the password in the EMAIL_SERVER URL
        // (smtps://resend:<key>@smtp.resend.com:465).
        const resendKey =
          process.env.RESEND_API_KEY ||
          (() => { try { return decodeURIComponent(new URL(provider.server as string).password); } catch { return ""; } })();

        if (resendKey) {
          console.log("[magic-link] sending via Resend API to:", identifier);
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: provider.from, to: identifier, subject, html, text }),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.error("[magic-link] Resend API error:", res.status, body);
            throw new Error(`Resend API ${res.status}`);
          }
          console.log("[magic-link] sent OK via Resend API");
          return;
        }

        // Fallback: SMTP via nodemailer (works where outbound SMTP is allowed).
        console.log("[magic-link] sending via SMTP to:", identifier);
        const transport = createTransport(provider.server as string);
        const result = await transport.sendMail({ to: identifier, from: provider.from, subject, text, html });
        console.log("[magic-link] sent OK via SMTP, messageId:", result.messageId);
      },
    })] : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // allowDangerousEmailAccountLinking handles account linking automatically.
      // We only need to ensure the JWT gets the existing user's ID (not a new one).
      if (account?.provider !== "credentials" && account?.provider !== "email" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existing) {
          user.id = existing.id;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Fetch onboardingComplete on first sign-in
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboardingComplete: true },
        });
        token.onboardingComplete = dbUser?.onboardingComplete ?? false;
      }
      if (trigger === "update") {
        // Refresh onboardingComplete after profile save
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { onboardingComplete: true },
        });
        token.onboardingComplete = dbUser?.onboardingComplete ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).onboardingComplete = token.onboardingComplete;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
};
