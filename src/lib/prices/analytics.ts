import { ITEMS, MARKETS, PRICE_RECORDS } from "./seed-data";
import type {
  AnomalyPoint,
  BasketSnapshot,
  FoodItem,
  MarketComparisonRow,
  MarketName,
  PricePoint,
  PriceRecord,
  SelectedMetrics,
  VolatilitySummary
} from "./types";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function getAvailableDates(records: PriceRecord[] = PRICE_RECORDS): string[] {
  return Array.from(new Set(records.map((record) => record.date))).sort();
}

export function filterByRange(records: PriceRecord[], months: number): PriceRecord[] {
  const dates = getAvailableDates(records);
  const allowed = new Set(dates.slice(Math.max(0, dates.length - months)));
  return records.filter((record) => allowed.has(record.date));
}

export function getSeries(records: PriceRecord[], item: FoodItem, market: MarketName): PricePoint[] {
  return records
    .filter((record) => record.item === item && record.market === market)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => ({
      date: record.date,
      monthLabel: record.monthLabel,
      price: record.price
    }));
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

export function rollingAverage(series: PricePoint[], windowSize: number): PricePoint[] {
  return series.map((point, index) => {
    const window = series.slice(Math.max(0, index - windowSize + 1), index + 1);
    return {
      ...point,
      price: Math.round(mean(window.map((entry) => entry.price)))
    };
  });
}

export function volatilitySummary(series: PricePoint[]): VolatilitySummary {
  const changes = series
    .slice(1)
    .map((point, index) => pctChange(point.price, series[index].price))
    .slice(-6);
  const score = standardDeviation(changes);

  if (score >= 7) {
    return { score, label: "High" };
  }

  if (score >= 3.8) {
    return { score, label: "Moderate" };
  }

  return { score, label: "Low" };
}

export function detectAnomalies(series: PricePoint[], windowSize = 6): AnomalyPoint[] {
  return series.flatMap((point, index) => {
    if (index < windowSize) {
      return [];
    }

    const window = series.slice(index - windowSize, index).map((entry) => entry.price);
    const windowMedian = median(window);
    const deviations = window.map((value) => Math.abs(value - windowMedian));
    const mad = median(deviations);
    const fallbackDeviation = standardDeviation(window);
    const denominator = mad === 0 ? fallbackDeviation || 1 : mad;
    const score = mad === 0 ? (point.price - windowMedian) / denominator : (0.6745 * (point.price - windowMedian)) / denominator;

    if (Math.abs(score) < 2.35) {
      return [];
    }

    return [
      {
        ...point,
        score,
        direction: point.price >= windowMedian ? "up" : "down"
      }
    ];
  });
}

export function getMarketComparison(
  records: PriceRecord[],
  item: FoodItem,
  date = getAvailableDates(records).at(-1) ?? ""
): MarketComparisonRow[] {
  const rows = records.filter((record) => record.item === item && record.date === date);
  const nationalMedian = median(rows.map((record) => record.price));
  return rows
    .map((record) => ({
      market: record.market,
      price: record.price,
      deltaPct: pctChange(record.price, nationalMedian),
      rank: 0,
      province: MARKETS.find((entry) => entry.market === record.market)?.province ?? ""
    }))
    .sort((a, b) => a.price - b.price)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getSelectedMetrics(
  records: PriceRecord[],
  item: FoodItem,
  market: MarketName
): SelectedMetrics {
  const series = getSeries(records, item, market);
  const latest = series[series.length - 1];
  const previous = series[series.length - 2] ?? latest;
  const latestSix = series.slice(-6);
  const latestDate = latest?.date ?? getAvailableDates(records).at(-1) ?? "";
  const comparison = getMarketComparison(records, item, latestDate);
  const currentRank = comparison.find((row) => row.market === market)?.rank ?? comparison.length;
  const anomaly = detectAnomalies(series).find((point) => point.date === latestDate) ?? null;

  return {
    latestPrice: latest?.price ?? 0,
    previousPrice: previous?.price ?? 0,
    momChangePct: latest && previous ? pctChange(latest.price, previous.price) : 0,
    rollingAverage3: Math.round(mean(series.slice(-3).map((point) => point.price))),
    average6: Math.round(mean(latestSix.map((point) => point.price))),
    volatility: volatilitySummary(series),
    anomaly,
    marketMedian: median(comparison.map((row) => row.price)),
    marketRank: currentRank,
    marketsCount: comparison.length
  };
}

export function getRecentAnomalies(
  records: PriceRecord[],
  item: FoodItem,
  limit = 5
): Array<AnomalyPoint & { market: MarketName; item: FoodItem }> {
  return MARKETS.flatMap(({ market }) =>
    detectAnomalies(getSeries(records, item, market)).map((point) => ({
      ...point,
      market,
      item
    }))
  )
    .sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.score) - Math.abs(a.score))
    .slice(0, limit);
}

export function getBasketSeries(records: PriceRecord[], householdSize: number): BasketSnapshot[] {
  const dates = getAvailableDates(records);
  const scale = Math.max(1, householdSize) / 4;

  return dates.map((date, dateIndex) => {
    const previousDate = dates[dateIndex - 1];
    const monthLabel = records.find((record) => record.date === date)?.monthLabel ?? date;

    const contributions = ITEMS.map(({ item, basketQuantity }) => {
      const monthPrices = records
        .filter((record) => record.date === date && record.item === item)
        .map((record) => record.price);
      const previousPrices = previousDate
        ? records
            .filter((record) => record.date === previousDate && record.item === item)
            .map((record) => record.price)
        : [];
      const medianPrice = median(monthPrices);
      const previousMedian = previousPrices.length > 0 ? median(previousPrices) : medianPrice;
      const cost = medianPrice * basketQuantity * scale;
      const previousCost = previousMedian * basketQuantity * scale;

      return {
        item,
        cost,
        contributionPct: 0,
        change: cost - previousCost
      };
    });

    const total = contributions.reduce((sum, item) => sum + item.cost, 0);
    const previousTotal =
      previousDate === undefined
        ? null
        : contributions.reduce((sum, item) => sum + item.cost - item.change, 0);

    return {
      date,
      monthLabel,
      total: Math.round(total),
      previousTotal: previousTotal === null ? null : Math.round(previousTotal),
      changePct: previousTotal === null ? null : pctChange(total, previousTotal),
      contributions: contributions
        .map((entry) => ({
          ...entry,
          cost: Math.round(entry.cost),
          contributionPct: total === 0 ? 0 : (entry.cost / total) * 100,
          change: Math.round(entry.change)
        }))
        .sort((a, b) => b.change - a.change)
    };
  });
}

export function getItemUnit(item: FoodItem): string {
  return ITEMS.find((entry) => entry.item === item)?.unit ?? "unit";
}
