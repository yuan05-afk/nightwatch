import { auth } from "@/lib/auth/server";

// Page-level redirect only. Every route handler re-checks the session itself.
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/console/:path*", "/reports/:path*", "/check/:path*", "/lead/:path*"],
};
