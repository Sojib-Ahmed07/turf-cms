// src/components/ui/Button.jsx
import Link from "next/link";
import { cn } from "@/lib/utils";

const VARIANTS = {
    brand:
        "bg-brand text-brand-ink hover:bg-brand-deep shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]",
    pitch: "bg-pitch text-white hover:bg-pitch-2",
    ink: "bg-ink text-white hover:bg-ink-2",
    flare: "bg-flare text-ink hover:brightness-95 shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]",
    white: "bg-white text-ink hover:bg-chalk",
    outline:
        "bg-transparent text-ink ring-1 ring-inset ring-line hover:ring-ink-4 hover:bg-white",
    "outline-light":
        "bg-white/5 text-white ring-1 ring-inset ring-white/25 hover:bg-white/12 backdrop-blur",
    ghost: "bg-transparent text-ink-2 hover:bg-ink/5 hover:text-ink",
};

const SIZES = {
    sm: "h-9 px-4 text-[13px] gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-13 px-7 text-[15px] gap-2.5",
    icon: "h-10 w-10 justify-center",
};

export default function Button({
    href,
    variant = "brand",
    size = "md",
    className,
    children,
    ...props
}) {
    const classes = cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold wide whitespace-nowrap",
        "transition-[background-color,box-shadow,transform,color] duration-200 active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
    );

    if (href) {
        return (
            <Link href={href} className={classes} {...props}>
                {children}
            </Link>
        );
    }
    return (
        <button type="button" className={classes} {...props}>
            {children}
        </button>
    );
}
