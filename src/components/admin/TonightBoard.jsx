// src/components/admin/TonightBoard.jsx
import { cn, time12 } from "@/lib/utils";

const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h < 6 ? h + 24 : h) * 60 + m; // after-midnight slots sit at the end
};

/**
 * Timeline of tonight's slots, one row per ground.
 * from/to: "16:30" / "01:30". now: "20:52".
 */
export default function TonightBoard({ rows = [], from = "16:30", to = "01:30", now = "20:52" }) {
    const start = toMin(from);
    const span = toMin(to) - start;
    const pos = (t) => `${((toMin(t) - start) / span) * 100}%`;
    const ticks = [];
    for (let m = start; m <= toMin(to); m += 90) {
        const h = Math.floor(m / 60) % 24;
        const mm = m % 60;
        ticks.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[720px]">
                {/* scale */}
                <div className="relative ml-[120px] h-6">
                    {ticks.map((t, i) => (
                        <span
                            key={t}
                            className={cn("absolute whitespace-nowrap text-[12px] font-medium text-ink-3 tnum", i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
                            style={{ left: pos(t) }}
                        >
                            {time12(t)}
                        </span>
                    ))}
                </div>

                <div className="relative mb-6">
                    {/* now line */}
                    <div className="pointer-events-none absolute inset-y-0 left-[120px] right-0">
                        <div className="absolute inset-y-[-6px] w-0 border-l-2 border-brand" style={{ left: pos(now) }}>
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white tnum">Now</span>
                        </div>
                    </div>

                    {rows.map((row) => (
                        <div key={row.pitch} className="flex items-center border-t border-line py-2.5 first:border-t-0">
                            <p className="w-[120px] shrink-0 text-[14px] font-semibold text-ink">{row.pitch}</p>
                            <div className="relative h-14 flex-1">
                                {row.blocks.map((b) => (
                                    <div
                                        key={b.start}
                                        className={cn(
                                            "absolute inset-y-0 flex flex-col justify-center overflow-hidden rounded-[12px] px-3",
                                            b.status === "confirmed" && "bg-pitch text-white",
                                            b.status === "held" && "bg-flare text-ink",
                                            b.status === "free" && "border-2 border-dashed border-line text-ink-4"
                                        )}
                                        style={{ left: `calc(${pos(b.start)} + 2px)`, width: `calc(${pos(b.end)} - ${pos(b.start)} - 4px)` }}
                                    >
                                        <span className="truncate text-[13px] font-semibold">{b.status === "free" ? "Free" : b.who}</span>
                                        <span className={cn("truncate text-[11px] tnum", b.status === "confirmed" ? "text-white/55" : b.status === "held" ? "text-ink/60" : "text-ink-4")}>
                                            {b.status === "held" ? "Waiting for payment" : `${time12(b.start)} to ${time12(b.end)}`}
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
