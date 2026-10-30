// src/features/booking/people.js
// Per-person grounds (swimming pool): the slot price is per person, and many bookings share a slot until the
// ground's capacity is full. Pure: safe on the server and in the browser.

/** Most people one booking can bring. */
export const MAX_PEOPLE_PER_BOOKING = 10;

/** Whole number 1..MAX_PEOPLE_PER_BOOKING (anything else becomes 1). */
export function clampPeople(n) {
    const v = Math.floor(Number(n));
    return Number.isFinite(v) ? Math.min(MAX_PEOPLE_PER_BOOKING, Math.max(1, v)) : 1;
}

/** Price of a slot for this booking: per person x people on per-person grounds, the slot price otherwise. */
export function slotTotal(price, people = null) {
    const p = Number(price) || 0;
    return people == null ? p : p * clampPeople(people);
}