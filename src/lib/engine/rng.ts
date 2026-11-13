/**
 * Seeded PRNG (mulberry32). The career save stores the current state number,
 * so reloading a save continues the exact same random sequence.
 */
export class Rng {
  constructor(public state: number) {}

  /** 0 ≤ n < 1 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Approximately normal (mean 0, sd 1). */
  normal(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.73;
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}

export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
