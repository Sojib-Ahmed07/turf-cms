// src/components/ui/Field.jsx
import { cn } from "@/lib/utils";

/** Label + control + hint/error. Wrap any input in it. */
export function Field({ label, hint, error, htmlFor, className, children }) {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && (
                <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-2">
                    {label}
                </label>
            )}
            {children}
            {error ? (
                <p className="text-xs font-medium text-danger">{error}</p>
            ) : hint ? (
                <p className="text-xs text-ink-3">{hint}</p>
            ) : null}
        </div>
    );
}

export function Input({ className, icon: Icon, ...props }) {
    return (
        <div className="relative">
            {Icon && (
                <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            )}
            <input
                className={cn(
                    "h-12 w-full rounded-ctl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-4",
                    "transition-[border-color,box-shadow] outline-none",
                    "focus:border-brand focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_18%,transparent)]",
                    Icon && "pl-10",
                    className
                )}
                {...props}
            />
        </div>
    );
}
