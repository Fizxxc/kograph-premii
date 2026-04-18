import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

const MAINTENANCE_ENABLED = true;
const MAINTENANCE_PATH = "/maintenance";
const EXCLUDED_PREFIXES = ["/_next", "/api", "/favicon.ico"];
const EXCLUDED_FILE_REGEX = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    MAINTENANCE_ENABLED &&
    pathname !== MAINTENANCE_PATH &&
    !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !EXCLUDED_FILE_REGEX.test(pathname)
  ) {
    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = MAINTENANCE_PATH;
    maintenanceUrl.search = "";
    return NextResponse.redirect(maintenanceUrl);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
