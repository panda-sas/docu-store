import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge proxy — lightweight request processing.
 *
 * Auth tokens live in localStorage (AuthZ mode), so Edge middleware
 * cannot validate them. Route protection is handled client-side via
 * AuthzGuard. This proxy only forwards the workspace slug header.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract workspace slug from path (first segment after /)
  const segments = pathname.split("/").filter(Boolean);
  const workspaceSlug = segments[0];

  if (workspaceSlug && workspaceSlug !== "(auth)") {
    const response = NextResponse.next();
    response.headers.set("x-workspace-slug", workspaceSlug);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\..*).*)"],
};
