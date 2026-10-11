// src/proxy.js
import { NextResponse } from "next/server";

const PROTECTED = ["/admin", "/bookings", "/profile"];

export function proxy(req) {
    const { pathname } = req.nextUrl;
    const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!needsAuth) return NextResponse.next();

    const hasSession =
        req.cookies.has("better-auth.session_token") ||
        req.cookies.has("__Secure-better-auth.session_token");

    if (!hasSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/bookings/:path*", "/profile/:path*"],
};