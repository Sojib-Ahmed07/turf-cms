// src/app/admin/pitches/[id]/page.jsx
import { notFound } from "next/navigation";
import SlotEditor from "@/features/admin/components/SlotEditor";
import { getPitchEditorData } from "@/features/admin/queries";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "স্লট এডিটর" };
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PitchSlotsPage({ params }) {
    await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) notFound();

    const data = await getPitchEditorData(id);
    if (!data) notFound();

    return <SlotEditor pitch={data.pitch} defaultBlocks={data.defaultBlocks} days={data.days} />;
}