import { formatCurrency, formatPct, getMarketComparison } from "./analytics";
import type { BasketSnapshot, FoodItem, MarketName, PriceRecord, SelectedMetrics } from "./types";

export function priceReadout(
  records: PriceRecord[],
  item: FoodItem,
  market: MarketName,
  metrics: SelectedMetrics
): string {
  const aboveAverage = metrics.latestPrice - metrics.average6;
  const averageDirection = aboveAverage >= 0 ? "above" : "below";
  const comparison = getMarketComparison(records, item);
  const cheaperMarkets = comparison
    .filter((row) => row.deltaPct < -1)
    .slice(0, 2)
    .map((row) => row.market);
  const spikeSentence = metrics.anomaly
    ? `The latest reading is outside normal movement and is flagged as a ${metrics.anomaly.direction === "up" ? "price spike" : "price drop"}.`
    : `The latest reading is within the normal ${metrics.volatility.label.toLowerCase()} volatility band.`;
  const marketSentence =
    cheaperMarkets.length > 0
      ? `${cheaperMarkets.join(" and ")} are currently below the national median.`
      : `${market} is close to the national median compared with other tracked markets.`;

  const distanceFromAverage = Math.abs((aboveAverage / Math.max(metrics.average6, 1)) * 100).toFixed(1);

  return `${item} in ${market} is ${distanceFromAverage}% ${averageDirection} its 6-month average at ${formatCurrency(metrics.latestPrice)}. Month-on-month movement is ${formatPct(metrics.momChangePct)}. ${spikeSentence} ${marketSentence}`;
}

export function seasonalInsight(item: FoodItem, metrics: SelectedMetrics): string {
  if (item === "Onion" || item === "Coconut") {
    return `${item} usually shows sharper seasonal movement than pantry staples, so short bursts should be compared against the 6-month average before treating them as structural inflation.`;
  }

  if (metrics.volatility.label === "High") {
    return `${item} has been moving unevenly over recent months. The forecast should be read as a short-range guide, not a stable price promise.`;
  }

  return `${item} has a relatively steady recent pattern. The 3-month average is a useful guide for near-term household budgeting.`;
}

export function basketReadout(snapshot: BasketSnapshot): string {
  const topMover = snapshot.contributions[0];
  const change = snapshot.changePct === null ? "no previous month comparison" : `${formatPct(snapshot.changePct)} from the previous month`;

  return `The estimated staple basket is ${formatCurrency(snapshot.total)}, ${change}. ${topMover.item} is the largest contributor to the latest increase at ${formatCurrency(Math.max(0, topMover.change))}.`;
}
