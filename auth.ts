import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

/**
 * JWT sessions pair cleanly with the credentials provider; the Prisma adapter
 * remains wired for OAuth/linking and for storing Auth.js tables on User.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        branchId: { label: "Branch", type: "text" },
      },
      authorize: async (credentials) => {
        const username =
          typeof credentials?.username === "string"
            ? credentials.username.trim()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const branchId =
          typeof credentials?.branchId === "string"
            ? credentials.branchId.trim()
            : "";

        if (!username || !password || !branchId) return null;

        const user = await prisma.user.findUnique({
          where: { username },
          include: { branch: { select: { id: true, name: true } } },
        });

        if (!user || !user.isActive || user.branchId !== branchId) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const safeLocalEmail =
          `${username.replace(/[^a-zA-Z0-9._%+-]/g, "_")}@users.local`;

        return {
          id: user.id,
          name: user.name ?? user.username,
          email: user.email ?? safeLocalEmail,
          image: user.image ?? undefined,
          role: user.role,
          branchId: user.branchId,
          username: user.username,
          branchName: user.branch.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = user.role;
        token.branchId = user.branchId;
        token.username = user.username;
        token.branchName = user.branchName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub ?? token.id) as string;
        session.user.role = token.role as string;
        session.user.branchId = token.branchId as string;
        session.user.username = token.username as string;
        session.user.branchName = token.branchName as string;
      }
      return session;
    },
  },
});
