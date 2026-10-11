// src/app/admin/media/page.jsx
import MediaLibrary from "@/features/cms/admin/MediaLibrary";
import { media } from "@/lib/admin-sample-data";

export const metadata = { title: "Media" };

export default function Page() {
    return <MediaLibrary items={media} />;
}
