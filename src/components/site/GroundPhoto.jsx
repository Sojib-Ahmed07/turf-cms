// src/components/site/GroundPhoto.jsx
import Image from "next/image";
import PitchLines from "./PitchLines";
import { canOptimize, cn } from "@/lib/utils";

/** Ground photo filling its (relative) parent, or chalk pitch lines when the admin hasn't added one. */
export default function GroundPhoto({ pitch, sizes = "100vw", className, priority = false }) {
    if (!pitch.imageUrl) {
        return (
            <div className="absolute inset-0 grid place-items-center bg-pitch">
                <PitchLines className={cn("h-full w-full text-white/20", className)} />
            </div>
        );
    }
    return (
        <Image
            src={pitch.imageUrl}
            alt={pitch.name}
            fill
            sizes={sizes}
            priority={priority}
            unoptimized={!canOptimize(pitch.imageUrl)}
            className={cn("object-cover", className)}
        />
    );
}