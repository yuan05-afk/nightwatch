import { auth } from "@/lib/auth/server";

// Page-level redirect only. Every route handler re-checks the session itself.
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/watchfloor/:path*", "/incidents/:path*", "/try/:path*", "/lead/:path*"],
};
