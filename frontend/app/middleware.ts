import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Geef hier de paden op die beschermd moeten worden
const protectedPaths = ["/dashboard", "/register-time", "/overview", "/vacation"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Controleer of de route beschermd is
    if (protectedPaths.some((path) => pathname.startsWith(path))) {
        const userId = request.cookies.get("userId")?.value;
        if (!userId) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        // Check user rank and redirect admin/manager to admin panel
        const userRank = request.cookies.get("userRank")?.value;
        if ((userRank === "admin" || userRank === "manager") && pathname === "/dashboard") {
            return NextResponse.redirect(new URL("/admin", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/register-time/:path*", "/overview/:path*", "/vacation/:path*"],
};
