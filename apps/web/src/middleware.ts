import { NextRequest, NextResponse } from "next/server";

const PROTECTED: Array<{ path: string; roles: string[] }> = [
  { path: "/applicant", roles: ["applicant"] },
  { path: "/employer", roles: ["employer"] },
  { path: "/verifier", roles: ["verifier"] },
  { path: "/admin", roles: ["admin"] },
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const match = PROTECTED.find((item) => pathname.startsWith(item.path));
  if (!match) return NextResponse.next();

  const token = req.cookies.get("accessToken")?.value;
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const [, payloadB64] = token.split(".");
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const userRoles: string[] = payload.roles ?? [];
    const allowed = match.roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      const dashPath =
        userRoles.includes("admin") ? "/admin" :
        userRoles.includes("verifier") ? "/verifier" :
        userRoles.includes("employer") ? "/employer" :
        "/applicant";
      return NextResponse.redirect(new URL(dashPath, req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/applicant/:path*", "/employer/:path*", "/verifier/:path*", "/admin/:path*"],
};
