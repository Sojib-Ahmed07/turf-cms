// src/app/admin/pitches/page.jsx
import GroundsList from "@/features/admin/components/GroundsList";
import { getAllPitchesAdmin } from "@/features/admin/queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Grounds & slots" };
export const dynamic = "force-dynamic";

export default async function AdminPitchesPage() {
    await requireRole(["admin"]);
    const pitches = await getAllPitchesAdmin();
    return <GroundsList pitches={pitches} />;
}