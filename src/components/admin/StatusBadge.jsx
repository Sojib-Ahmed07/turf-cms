// src/components/admin/StatusBadge.jsx
import Badge from "@/components/ui/Badge";

const MAP = {
    confirmed: ["brand", "কনফার্মড"],
    held: ["flare", "পেমেন্ট বাকি"],
    completed: ["neutral", "খেলা শেষ"],
    cancelled: ["danger", "ক্যানসেল"],
    expired: ["neutral", "মেয়াদ শেষ"],
    refund_due: ["danger", "টাকা ফেরত বাকি"],
    valid: ["brand", "পেমেন্ট হয়েছে"],
    paid: ["brand", "পেমেন্ট হয়েছে"],
    used_up: ["neutral", "ব্যবহার শেষ"],
    initiated: ["flare", "শুরু হয়েছে"],
    failed: ["danger", "ফেইল"],
    refunded: ["neutral", "টাকা ফেরত দেওয়া হয়েছে"],
    active: ["brand", "চালু"],
    scheduled: ["flare", "সময় ঠিক করা"],
    hidden: ["neutral", "লুকানো"],
    ended: ["neutral", "শেষ"],
};

export default function StatusBadge({ status }) {
    const [tone, label] = MAP[status] ?? ["neutral", status];
    return (
        <Badge tone={tone} dot>
            {label}
        </Badge>
    );
}