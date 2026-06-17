export type FoodItem =
  | "Rice"
  | "Dhal"
  | "Coconut"
  | "Eggs"
  | "Chicken"
  | "Fish"
  | "Flour"
  | "Sugar"
  | "Milk Powder"
  | "Onion";

export type MarketName =
  | "Colombo"
  | "Kandy"
  | "Galle"
  | "Jaffna"
  | "Anuradhapura"
  | "Kurunegala"
  | "Batticaloa"
  | "Matara";

export interface ItemInfo {
  item: FoodItem;
  unit: string;
  category: "grain" | "protein" | "produce" | "pantry" | "dairy";
  basketQuantity: number;
}

export interface MarketInfo {
  market: MarketName;
  province: string;
}

export interface PriceRecord {
  date: string;
  monthLabel: string;
  item: FoodItem;
  market: MarketName;
  price: number;
  unit: string;
}

export interface PricePoint {
  date: string;
  monthLabel: string;
  price: number;
}

export interface ForecastPoint {
  date: string;
  monthLabel: string;
  price: number;
  forecast: true;
}

export interface AnomalyPoint extends PricePoint {
  score: number;
  direction: "up" | "down";
}

export interface VolatilitySummary {
  score: number;
  label: "Low" | "Moderate" | "High";
}

export interface SelectedMetrics {
  latestPrice: number;
  previousPrice: number;
  momChangePct: number;
  rollingAverage3: number;
  average6: number;
  volatility: VolatilitySummary;
  anomaly: AnomalyPoint | null;
  marketMedian: number;
  marketRank: number;
  marketsCount: number;
}

export interface MarketComparisonRow {
  market: MarketName;
  price: number;
  deltaPct: number;
  rank: number;
  province: string;
}

export interface BasketSnapshot {
  date: string;
  monthLabel: string;
  total: number;
  previousTotal: number | null;
  changePct: number | null;
  contributions: Array<{
    item: FoodItem;
    cost: number;
    contributionPct: number;
    change: number;
  }>;
}
