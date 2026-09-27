// Bay-row-tier slot strings such as "22-04-84".

export interface SlotAddress {
  bay: number;
  row: number;
  tier: number;
}

const SLOT = /^(\d{2,3})-(\d{2})-(\d{2})$/;

export function parseSlot(text: string): SlotAddress | null {
  const m = SLOT.exec(text);
  if (!m) return null;
  return { bay: Number(m[1]), row: Number(m[2]), tier: Number(m[3]) };
}

export function formatSlot(s: SlotAddress): string {
  return `${pad2(s.bay)}-${pad2(s.row)}-${pad2(s.tier)}`;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 20 ft boxes stow in odd bays, 40 and 45 ft boxes in the even 40 ft bay. */
export function bayFitsSize(bay: number, sizeFt: 20 | 40 | 45): boolean {
  return sizeFt === 20 ? bay % 2 === 1 : bay % 2 === 0;
}
