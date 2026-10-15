// src/app/(site)/error.jsx
"use client"; // error boundaries must be client components

import ErrorPanel from "@/components/ErrorPanel";

export default function Error({ error, retry }) {
    return <ErrorPanel error={error} retry={retry} />;
}