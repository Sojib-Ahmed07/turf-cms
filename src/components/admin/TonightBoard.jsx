// src/components/admin/TonightBoard.jsx
import { cn, time12 } from "@/lib/utils";

/** Minutes on the board's clock (may pass 1440 after midnight) -> "HH:MM". */
const fromMin = (m) => {
    const h = Math.floor(m / 60) % 24;
    return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/**
 * Timeline of today's slots, one row per ground.
 * rows: [{ pitch, blocks: [{ start, end, at, until, status: "confirmed" | "held" | "free" | "past", who }] }]
 * at/until, from/to and now are minutes since midnight of today's date; after-midnight times go past 1440
 * (each ground decides that from its own first slot, so a 5 am opening and a 2 am close both line up).
 */
export default function TonightBoard({ rows = [], from, to, now }) {
    if (!rows.length || from == null || to == null) {
        return <p className="py-8 text-center text-[14px] text-ink-3">No open grounds with slots today.</p>;
    }

    const start = from;
    const end = to;
    const span = Math.max(60, end - start);
    const pos = (m) => `${((m - start) / span) * 100}%`;

    // ~6–8 ticks whatever the opening hours
    const step = span > 12 * 60 ? 180 : span > 6 * 60 ? 120 : 60;
    const ticks = [];
    for (let m = Math.ceil(start / 60) * 60; m <= end; m += step) ticks.push(m);

    const nowMin = typeof now === "number" ? now : null;
    const showNow = nowMin !== null && nowMin >= start && nowMin <= end;
    const width = Math.max(720, Math.round(span / 1.4));

    return (
        <div className="overflow-x-auto">
            <div style={{ minWidth: width }}>
                {/* scale */}
                <div className="relative ml-[120px] h-6">
                    {ticks.map((t) => (
                        <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap text-[12px] font-medium text-ink-3 tnum" style={{ left: pos(t) }}>
                            {time12(fromMin(t))}
                        </span>
                    ))}
                </div>

                <div className="relative mb-6">
                    {showNow && (
                        <div className="pointer-events-none absolute inset-y-0 left-[120px] right-0 z-10">
                            <div className="absolute inset-y-[-6px] w-0 border-l-2 border-brand" style={{ left: pos(nowMin) }}>
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white tnum">
                                    Now
                                </span>
                            </div>
                        </div>
                    )}

                    {rows.map((row) => (
                        <div key={row.pitch} className="flex items-center border-t border-line py-2.5 first:border-t-0">
                            <p className="w-[120px] shrink-0 pr-3 text-[14px] font-semibold text-ink">{row.pitch}</p>
                            <div className="relative h-14 flex-1">
                                {row.blocks.map((b) => (
                                    <div
                                        key={b.start}
                                        title={`${time12(b.start)} to ${time12(b.end)}${b.who ? `, ${b.who}` : ""}`}
                                        className={cn(
                                            "absolute inset-y-0 flex flex-col justify-center overflow-hidden rounded-[12px] px-3",
                                            b.status === "confirmed" && "bg-pitch text-white",
                                            b.status === "held" && "bg-flare text-ink",
                                            b.status === "free" && "border-2 border-dashed border-line text-ink-4",
                                            b.status === "past" && "bg-ink/[0.04] text-ink-4"
                                        )}
                                        style={{ left: `calc(${pos(b.at)} + 2px)`, width: `calc(${pos(b.until)} - ${pos(b.at)} - 4px)` }}
                                    >
                                        <span className="truncate text-[13px] font-semibold">
                                            {b.status === "free" ? "Free" : b.status === "past" ? "Passed" : b.who}
                                        </span>
                                        <span
                                            className={cn(
                                                "truncate text-[11px] tnum",
                                                b.status === "confirmed" ? "text-white/55" : b.status === "held" ? "text-ink/60" : "text-ink-4"
                                            )}
                                        >
                                            {b.status === "held" ? "Waiting for payment" : time12(b.start)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}