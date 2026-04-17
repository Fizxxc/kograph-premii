import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_TARGET = new Date("2026-04-22T22:00:00+07:00").getTime();

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const now = Date.now();
  const maintenanceActive = now < MAINTENANCE_TARGET;

  if (!maintenanceActive) {
    if (pathname === "/maintenance") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/maintenance") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon-192.png|sw.js|push-notification.js).*)"
  ]
};
