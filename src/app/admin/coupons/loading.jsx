// src/app/admin/coupons/loading.jsx
import { TableSkeleton } from "@/components/admin/AdminSkeletons";

export default function Loading() {
    return <TableSkeleton tabs={0} rows={4} />;
}