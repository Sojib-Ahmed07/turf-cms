// src/features/cms/admin/NavigationEditor.jsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { PageHeader, Panel, OrderButtons, SettingRow, SaveBar } from "@/components/admin/Kit";
import { useToast } from "@/components/admin/Toast";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { CharInput } from "@/components/ui/Inputs";
import { saveMenu } from "@/features/cms/actions/settings";
import { cn } from "@/lib/utils";

/** initial: from getNavAdmin() -> { items: [{ id, label, href, isVisible }], menuButtonLabel, showMyBookings } */
export default function NavigationEditor({ initial }) {
    const router = useRouter();
    const [form, setForm] = useState(initial);
    const [saved, setSaved] = useState(initial);
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();
    const { toast, showToast } = useToast();

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

    const updateItem = (id, patch) => {
        setError("");
        setForm((f) => ({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
    };
    const move = (index, dir) => {
        setForm((f) => {
            const items = [...f.items];
            const j = index + dir;
            if (j < 0 || j >= items.length) return f;
            [items[index], items[j]] = [items[j], items[index]];
            return { ...f, items };
        });
    };

    function save() {
        startTransition(async () => {
            const res = await saveMenu({
                items: form.items.map(({ id, label, isVisible }) => ({ id, label, isVisible })),
                menuButtonLabel: form.menuButtonLabel,
                showMyBookings: form.showMyBookings,
            });
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setSaved(form);
            showToast("Menu saved");
            router.refresh();
        });
    }

    return (
        <div className="mx-auto max-w-[920px]">
            <PageHeader
                title="Navigation"
                description="Rename or hide the links in the top menu and change their order. The pages they open stay the same."
            />

            <Panel title="Menu links" bodyClassName="p-3">
                {form.items.length === 0 ? (
                    <p className="px-3 py-8 text-center text-[14px] text-ink-3">No menu links yet. Run the seed to add the default links.</p>
                ) : (
                    <>
                        <div className="hidden grid-cols-[32px_1fr_180px_56px] gap-4 px-3 pb-2 text-[12px] font-semibold text-ink-3 sm:grid">
                            <span />
                            <span>Label</span>
                            <span>Opens</span>
                            <span className="text-right">Show</span>
                        </div>
                        <ul className="space-y-1.5">
                            {form.items.map((item, i) => (
                                <li
                                    key={item.id}
                                    className={cn(
                                        "grid grid-cols-[32px_1fr_56px] items-center gap-4 rounded-[14px] p-2 hover:bg-chalk sm:grid-cols-[32px_1fr_180px_56px]",
                                        !item.isVisible && "opacity-60"
                                    )}
                                >
                                    <OrderButtons onMove={(d) => move(i, d)} first={i === 0} last={i === form.items.length - 1} label={item.label} />
                                    <CharInput max={18} value={item.label} onChange={(e) => updateItem(item.id, { label: e.target.value })} aria-label="Menu label" />
                                    <span className="hidden items-center gap-1.5 truncate text-[13px] text-ink-3 sm:flex">
                                        <Lock className="h-3 w-3 shrink-0" />
                                        {item.href}
                                    </span>
                                    <span className="flex justify-end">
                                        <Switch
                                            checked={item.isVisible}
                                            onChange={(v) => updateItem(item.id, { isVisible: v })}
                                            label={`Show ${item.label}`}
                                        />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Panel>

            <Panel className="mt-6" title="Menu button">
                <SettingRow label="Button text" hint="The green button on the right of the menu.">
                    <CharInput
                        max={16}
                        value={form.menuButtonLabel}
                        onChange={(e) => {
                            setError("");
                            setForm((f) => ({ ...f, menuButtonLabel: e.target.value }));
                        }}
                        className="max-w-xs"
                    />
                </SettingRow>
                <SettingRow label="Show “My bookings”" hint="Link for signed-in players.">
                    <Switch checked={form.showMyBookings} onChange={(v) => setForm((f) => ({ ...f, showMyBookings: v }))} label="Show My bookings" />
                </SettingRow>
            </Panel>

            {dirty && (
                <SaveBar error={error}>
                    <Button
                        variant="outline-light"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                            setForm(saved);
                            setError("");
                        }}
                    >
                        Discard
                    </Button>
                    <Button size="sm" disabled={pending} onClick={save}>
                        {pending ? "Saving…" : "Save menu"}
                    </Button>
                </SaveBar>
            )}
            {toast}
        </div>
    );
}