import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      branchId: string;
      username: string;
      branchName: string;
    };
  }

  interface User {
    role?: string;
    branchId?: string;
    username?: string;
    branchName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    branchId?: string;
    username?: string;
    branchName?: string;
  }
}
