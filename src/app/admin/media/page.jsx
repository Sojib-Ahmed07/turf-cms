// src/app/admin/media/page.jsx
import MediaLibrary from "@/features/cms/admin/MediaLibrary";
import { getMediaAdmin } from "@/features/cms/admin-queries";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireRole } from "@/lib/guards";

export const metadata = { title: "Media" };

export default async function Page() {
    await requireRole(["admin"]);
    return <MediaLibrary items={await getMediaAdmin()} uploadsReady={isCloudinaryConfigured()} />;
}