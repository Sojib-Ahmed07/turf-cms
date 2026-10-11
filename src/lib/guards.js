// src/lib/guards.js
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
    const h = await headers();
    return auth.api.getSession({ headers: h });
}

export async function requireUser(next = "/") {
    const session = await getSession();
    if (!session?.user) redirect(`/login?next=${encodeURIComponent(next)}`);
    return session.user;
}

export async function requireRole(roles) {
    const session = await getSession();
    if (!session?.user) redirect("/login?next=/admin");
    if (!roles.includes(session.user.role)) redirect("/");
    return session.user;
}