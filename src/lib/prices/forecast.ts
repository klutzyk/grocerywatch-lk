import { monthLabel } from "./seed-data";
import type { ForecastPoint, PricePoint } from "./types";

function addMonths(date: string, offset: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const next = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function linearRegression(values: number[]): { intercept: number; slope: number } {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / n;
  const numerator = values.reduce((sum, value, index) => sum + (index - xMean) * (value - yMean), 0);
  const denominator = values.reduce((sum, _value, index) => sum + (index - xMean) ** 2, 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  return { intercept: yMean - slope * xMean, slope };
}

function exponentialLevel(values: number[], alpha = 0.42): number {
  return values.reduce((level, value) => alpha * value + (1 - alpha) * level, values[0] ?? 0);
}

export function forecastNextMonths(series: PricePoint[], periods = 3): ForecastPoint[] {
  if (series.length === 0) {
    return [];
  }

  const recent = series.slice(-12);
  const values = recent.map((point) => point.price);
  const { intercept, slope } = linearRegression(values);
  const smoothedLevel = exponentialLevel(values);
  const lastPoint = series[series.length - 1];
  const lastPrice = lastPoint.price;

  return Array.from({ length: periods }, (_, index) => {
    const offset = index + 1;
    const date = addMonths(lastPoint.date, offset);
    const regressionEstimate = intercept + slope * (values.length - 1 + offset);
    const smoothingDrift = smoothedLevel + (smoothedLevel - lastPrice) * 0.25 + slope * offset;
    const blended = regressionEstimate * 0.62 + smoothingDrift * 0.38;

    return {
      date,
      monthLabel: monthLabel(date),
      price: Math.max(1, Math.round(blended)),
      forecast: true
    };
  });
}
