import type { FoodItem, ItemInfo, MarketInfo, MarketName, PriceRecord } from "./types";

export const ITEMS: ItemInfo[] = [
  { item: "Rice", unit: "kg", category: "grain", basketQuantity: 18 },
  { item: "Dhal", unit: "kg", category: "pantry", basketQuantity: 3 },
  { item: "Coconut", unit: "nut", category: "produce", basketQuantity: 18 },
  { item: "Eggs", unit: "egg", category: "protein", basketQuantity: 30 },
  { item: "Chicken", unit: "kg", category: "protein", basketQuantity: 4 },
  { item: "Fish", unit: "kg", category: "protein", basketQuantity: 3 },
  { item: "Flour", unit: "kg", category: "grain", basketQuantity: 5 },
  { item: "Sugar", unit: "kg", category: "pantry", basketQuantity: 4 },
  { item: "Milk Powder", unit: "400g", category: "dairy", basketQuantity: 4 },
  { item: "Onion", unit: "kg", category: "produce", basketQuantity: 4 }
];

export const MARKETS: MarketInfo[] = [
  { market: "Colombo", province: "Western" },
  { market: "Kandy", province: "Central" },
  { market: "Galle", province: "Southern" },
  { market: "Jaffna", province: "Northern" },
  { market: "Anuradhapura", province: "North Central" },
  { market: "Kurunegala", province: "North Western" },
  { market: "Batticaloa", province: "Eastern" },
  { market: "Matara", province: "Southern" }
];

export const MONTHS = [
  "2024-07",
  "2024-08",
  "2024-09",
  "2024-10",
  "2024-11",
  "2024-12",
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06"
];

const BASE_PRICE: Record<FoodItem, number> = {
  Rice: 285,
  Dhal: 410,
  Coconut: 115,
  Eggs: 62,
  Chicken: 1320,
  Fish: 1180,
  Flour: 255,
  Sugar: 320,
  "Milk Powder": 1280,
  Onion: 340
};

const MONTHLY_TREND: Record<FoodItem, number> = {
  Rice: 0.006,
  Dhal: 0.004,
  Coconut: 0.010,
  Eggs: 0.008,
  Chicken: 0.005,
  Fish: 0.007,
  Flour: 0.003,
  Sugar: 0.001,
  "Milk Powder": 0.004,
  Onion: 0.011
};

const SEASONALITY: Record<FoodItem, { amplitude: number; phase: number }> = {
  Rice: { amplitude: 0.035, phase: 2 },
  Dhal: { amplitude: 0.025, phase: 5 },
  Coconut: { amplitude: 0.09, phase: 1 },
  Eggs: { amplitude: 0.045, phase: 4 },
  Chicken: { amplitude: 0.035, phase: 11 },
  Fish: { amplitude: 0.06, phase: 10 },
  Flour: { amplitude: 0.02, phase: 7 },
  Sugar: { amplitude: 0.025, phase: 8 },
  "Milk Powder": { amplitude: 0.018, phase: 3 },
  Onion: { amplitude: 0.12, phase: 9 }
};

const MARKET_FACTOR: Record<MarketName, number> = {
  Colombo: 1.07,
  Kandy: 0.99,
  Galle: 1.01,
  Jaffna: 1.08,
  Anuradhapura: 0.94,
  Kurunegala: 0.96,
  Batticaloa: 1.03,
  Matara: 1.0
};

const SPIKES: Array<{
  item: FoodItem;
  markets?: MarketName[];
  date: string;
  lift: number;
}> = [
  { item: "Onion", date: "2025-12", lift: 0.27 },
  { item: "Coconut", date: "2026-02", lift: 0.18 },
  { item: "Eggs", date: "2025-05", lift: 0.16 },
  { item: "Fish", markets: ["Jaffna", "Batticaloa"], date: "2025-10", lift: 0.15 },
  { item: "Rice", markets: ["Colombo", "Galle"], date: "2026-04", lift: 0.12 },
  { item: "Dhal", date: "2024-12", lift: 0.11 }
];

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "2-digit"
});

export function monthLabel(date: string): string {
  return monthFormatter.format(new Date(`${date}-01T00:00:00Z`));
}

function deterministicNoise(itemIndex: number, marketIndex: number, monthIndex: number): number {
  return Math.sin((itemIndex + 1) * 13.37 + (marketIndex + 2) * 7.91 + monthIndex * 3.19) * 0.025;
}

function spikeLift(item: FoodItem, market: MarketName, date: string): number {
  return SPIKES.filter(
    (spike) =>
      spike.item === item &&
      spike.date === date &&
      (!spike.markets || spike.markets.includes(market))
  ).reduce((total, spike) => total + spike.lift, 0);
}

function generatedPrice(item: FoodItem, market: MarketName, date: string, monthIndex: number): number {
  const itemIndex = ITEMS.findIndex((entry) => entry.item === item);
  const marketIndex = MARKETS.findIndex((entry) => entry.market === market);
  const monthNumber = Number(date.slice(5, 7));
  const seasonal = SEASONALITY[item];
  const seasonalLift =
    Math.sin(((monthNumber + seasonal.phase) / 12) * Math.PI * 2) * seasonal.amplitude;
  const trendLift = monthIndex * MONTHLY_TREND[item];
  const localNoise = deterministicNoise(itemIndex, marketIndex, monthIndex);
  const price =
    BASE_PRICE[item] *
    MARKET_FACTOR[market] *
    (1 + trendLift + seasonalLift + localNoise + spikeLift(item, market, date));

  if (BASE_PRICE[item] > 900) {
    return Math.round(price / 10) * 10;
  }

  if (BASE_PRICE[item] < 130) {
    return Math.max(1, Math.round(price));
  }

  return Math.round(price / 5) * 5;
}

export const PRICE_RECORDS: PriceRecord[] = MONTHS.flatMap((date, monthIndex) =>
  ITEMS.flatMap(({ item, unit }) =>
    MARKETS.map(({ market }) => ({
      date,
      monthLabel: monthLabel(date),
      item,
      market,
      price: generatedPrice(item, market, date, monthIndex),
      unit
    }))
  )
);

export const DEFAULT_ITEM: FoodItem = "Rice";
export const DEFAULT_MARKET: MarketName = "Colombo";
