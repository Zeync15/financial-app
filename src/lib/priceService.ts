// Client-side market-price lookup. Calls Finnhub directly from the browser
// (free tier: real-time US stock/ETF quotes, CORS-enabled, key in query param).
//
// Only USD holdings are auto-priceable here — Bursa Malaysia and other exchanges
// aren't on any free browser API, so those prices are entered manually in the UI.
// If no API key is configured, getQuote returns null and the UI falls back to
// cost basis, so the app keeps working without a key.

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;
const FINNHUB_BASE = "https://finnhub.io/api/v1";

// Currencies we can auto-price via Finnhub's free tier (US-listed symbols).
export function isAutoPriceable(currency: string): boolean {
  return currency === "USD";
}

// Latest price for a US symbol, or null on missing key / network / no data.
export async function getQuote(symbol: string): Promise<number | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number };
    // Finnhub returns c = 0 for unknown symbols; treat that as no data.
    return data.c && data.c > 0 ? data.c : null;
  } catch {
    return null;
  }
}
