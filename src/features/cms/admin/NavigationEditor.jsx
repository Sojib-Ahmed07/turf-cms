// src/features/cms/admin/NavigationEditor.jsx
"use client";

import { Lock } from "lucide-react";
import { PageHeader, Panel, DragHandle, SettingRow, SaveBar } from "@/components/admin/Kit";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { CharInput } from "@/components/ui/Inputs";

export default function NavigationEditor({ items = [] }) {
    return (
        <div className="mx-auto max-w-[920px]">
            <PageHeader
                title="Navigation"
                description="Rename or hide the links in the top menu and change their order. The pages they open stay the same."
            />

            <Panel title="Menu links" bodyClassName="p-3">
                <div className="hidden grid-cols-[32px_1fr_180px_56px] gap-4 px-3 pb-2 text-[12px] font-semibold text-ink-3 sm:grid">
                    <span />
                    <span>Label</span>
                    <span>Opens</span>
                    <span className="text-right">Show</span>
                </div>
                <ul className="space-y-1.5">
                    {items.map((item) => (
                        <li key={item.href} className="grid grid-cols-[32px_1fr_56px] items-center gap-4 rounded-[14px] p-2 hover:bg-chalk sm:grid-cols-[32px_1fr_180px_56px]">
                            <DragHandle />
                            <CharInput max={18} defaultValue={item.label} />
                            <span className="hidden items-center gap-1.5 truncate text-[13px] text-ink-3 sm:flex">
                                <Lock className="h-3 w-3 shrink-0" />
                                {item.href}
                            </span>
                            <span className="flex justify-end">
                                <Switch defaultChecked label={`Show ${item.label}`} />
                            </span>
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel className="mt-6" title="Menu button">
                <SettingRow label="Button text" hint="The green button on the right of the menu.">
                    <CharInput max={16} defaultValue="Book a slot" className="max-w-xs" />
                </SettingRow>
                <SettingRow label="Show “My bookings”" hint="Link for signed-in players.">
                    <Switch defaultChecked label="Show My bookings" />
                </SettingRow>
            </Panel>

            <SaveBar>
                <Button variant="outline-light" size="sm">Discard</Button>
                <Button size="sm">Save menu</Button>
            </SaveBar>
        </div>
    );
}
