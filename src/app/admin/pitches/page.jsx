// src/app/admin/pitches/page.jsx
import GroundsList from "@/features/admin/components/GroundsList";
import { pitches } from "@/lib/sample-data";

export const metadata = { title: "Grounds & slots" };

export default function Page() {
    return <GroundsList pitches={pitches} />;
}
