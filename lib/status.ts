// The 4 fixed repair stages, in order, per PRD.md Section 5.
export const STATUS_STAGES = ["Received", "In Repair", "Ready for Pickup", "Completed"] as const;
export type StatusStage = (typeof STATUS_STAGES)[number];
