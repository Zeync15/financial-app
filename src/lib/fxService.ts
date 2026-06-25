// Currency conversion to MYR for the investments total. Uses open.er-api.com —
// free, no API key, CORS-enabled. Rates are cached in memory for the session so
// we don't refetch the same pair repeatedly. Returns null on failure; callers
// should treat a null rate as "can't convert" rather than assuming parity.

const cache = new Map<string, number>();

// How many MYR one unit of `currency` is worth. MYR -> 1. null if unavailable.
export async function getRateToMYR(currency: string): Promise<number | null> {
  if (currency === "MYR") return 1;
  if (cache.has(currency)) return cache.get(currency)!;
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const rate = data.rates?.MYR;
    if (data.result === "success" && typeof rate === "number" && rate > 0) {
      cache.set(currency, rate);
      return rate;
    }
    return null;
  } catch {
    return null;
  }
}

// Resolve MYR rates for a set of currencies in parallel.
export async function getRatesToMYR(currencies: string[]): Promise<Record<string, number | null>> {
  const unique = [...new Set(currencies)];
  const entries = await Promise.all(unique.map(async (c) => [c, await getRateToMYR(c)] as const));
  return Object.fromEntries(entries);
}
