// src/components/admin/StatusBadge.jsx
import Badge from "@/components/ui/Badge";

const MAP = {
    confirmed: ["brand", "Confirmed"],
    held: ["flare", "Payment open"],
    completed: ["neutral", "Played"],
    cancelled: ["danger", "Cancelled"],
    expired: ["neutral", "Expired"],
    refund_due: ["danger", "Refund due"],
    valid: ["brand", "Paid"],
    paid: ["brand", "Paid"],
    used_up: ["neutral", "Used up"],
    initiated: ["flare", "Started"],
    failed: ["danger", "Failed"],
    refunded: ["neutral", "Refunded"],
    active: ["brand", "Live"],
    scheduled: ["flare", "Scheduled"],
    hidden: ["neutral", "Hidden"],
    ended: ["neutral", "Ended"],
};

export default function StatusBadge({ status }) {
    const [tone, label] = MAP[status] ?? ["neutral", status];
    return (
        <Badge tone={tone} dot>
            {label}
        </Badge>
    );
}