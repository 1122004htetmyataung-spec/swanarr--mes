import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { USER_ROLE } from "@/lib/db-enums";

export type OwnerSessionResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Ensures the request is authenticated and the user has the OWNER role.
 * Use in Route Handlers for User Management and related OWNER-only APIs.
 */
export async function requireOwner(): Promise<OwnerSessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  if (session.user.role !== USER_ROLE.OWNER) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden. Owner role required." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: session.user.id };
}
