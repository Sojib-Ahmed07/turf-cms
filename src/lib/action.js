// src/lib/action.js
import "server-only";
import { requireRole } from "@/lib/guards";

/** action(schema, roles, handler) -> async (input) => { ok, data?, error?, fieldErrors? } */
export function action(schema, roles, handler) {
    return async (input) => {
        try {
            const user = roles ? await requireRole(roles) : null;
            const parsed = schema ? schema.safeParse(input) : { success: true, data: input };
            if (!parsed.success) {
                return {
                    ok: false,
                    error: "চিহ্নিত ঘরগুলো দেখে নিন।",
                    fieldErrors: parsed.error.flatten().fieldErrors,
                };
            }
            const data = await handler(parsed.data, { user });
            return { ok: true, data };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err.publicMessage ?? "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।" };
        }
    };
}