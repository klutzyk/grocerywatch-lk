"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calculator,
  Database,
  LineChart as LineChartIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Sprout,
  TrendingUp
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  detectAnomalies,
  filterByRange,
  formatCurrency,
  formatPct,
  getBasketSeries,
  getItemUnit,
  getMarketComparison,
  getRecentAnomalies,
  getSelectedMetrics,
  getSeries,
  rollingAverage
} from "@/lib/prices/analytics";
import { basketReadout, priceReadout, seasonalInsight } from "@/lib/prices/explanations";
import { forecastNextMonths } from "@/lib/prices/forecast";
import { DEFAULT_ITEM, DEFAULT_MARKET, ITEMS, MARKETS, PRICE_RECORDS } from "@/lib/prices/seed-data";
import type { FoodItem, MarketName } from "@/lib/prices/types";

const TABS = ["Trend", "Markets", "Basket", "Method"] as const;
type Tab = (typeof TABS)[number];

type TrendDatum = {
  date: string;
  monthLabel: string;
  price: number;
  Actual: number | null;
  Forecast: number | null;
  "3M average": number | null;
};

const RANGE_OPTIONS = [
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
  { label: "18M", value: 18 },
  { label: "24M", value: 24 }
];

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function compactLkrAxis(value: number | string): string {
  const numeric = Number(value);

  if (Math.abs(numeric) >= 1000) {
    const compact = numeric / 1000;
    return `${compact >= 10 ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }

  return `${Math.round(numeric)}`;
}

function PriceTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-ink/15 bg-paper px-3 py-2 text-xs shadow-panel">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      <div className="space-y-1">
        {payload
          .filter((entry) => entry.value !== null && entry.value !== undefined)
          .map((entry) => (
            <div key={`${entry.name}`} className="flex min-w-36 items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-ink/65">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#0f4a35" }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-ink">{formatCurrency(Number(entry.value))}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function PercentTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-ink/15 bg-paper px-3 py-2 text-xs shadow-panel">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((entry) => (
        <div key={`${entry.name}`} className="flex min-w-36 items-center justify-between gap-4">
          <span className="text-ink/65">{entry.name}</span>
          <span className="font-semibold text-ink">{formatCurrency(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
}

function MarketTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-ink/15 bg-paper px-3 py-2 text-xs shadow-panel">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((entry) => {
        const isDelta = entry.dataKey === "deltaPct";
        return (
          <div key={`${entry.name}`} className="flex min-w-36 items-center justify-between gap-4">
            <span className="text-ink/65">{entry.name}</span>
            <span className="font-semibold text-ink">
              {isDelta ? formatPct(Number(entry.value)) : formatCurrency(Number(entry.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
  trend,
  tone,
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  trend?: number;
  tone?: "neutral" | "good" | "warn" | "danger";
  icon: typeof TrendingUp;
}) {
  const trendIsUp = (trend ?? 0) >= 0;

  return (
    <section className="rounded-md border border-ink/12 bg-paper p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">{label}</span>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded border",
            tone === "danger"
              ? "border-danger/25 bg-danger/10 text-danger"
              : tone === "warn"
                ? "border-saffron/30 bg-saffron/15 text-clay"
                : "border-leaf/15 bg-leaf/10 text-leaf"
          )}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-semibold leading-none text-ink">{value}</p>
        {trend !== undefined ? (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold",
              trendIsUp ? "bg-danger/10 text-danger" : "bg-leaf/10 text-leaf"
            )}
          >
            {trendIsUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {formatPct(trend)}
          </span>
        ) : null}
      </div>
      <p className="mt-3 min-h-9 text-sm leading-snug text-ink/62">{detail}</p>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  note
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-saffron">{eyebrow}</p>
        <h2 className="font-display text-2xl font-semibold leading-tight text-ink">{title}</h2>
      </div>
      {note ? <p className="max-w-md text-sm leading-snug text-ink/62">{note}</p> : null}
    </div>
  );
}

export function PricePulseDashboard() {
  const [item, setItem] = useState<FoodItem>(DEFAULT_ITEM);
  const [market, setMarket] = useState<MarketName>(DEFAULT_MARKET);
  const [rangeMonths, setRangeMonths] = useState(24);
  const [activeTab, setActiveTab] = useState<Tab>("Trend");
  const [householdSize, setHouseholdSize] = useState(4);

  const records = useMemo(() => filterByRange(PRICE_RECORDS, rangeMonths), [rangeMonths]);
  const unit = getItemUnit(item);
  const series = useMemo(() => getSeries(records, item, market), [records, item, market]);
  const forecast = useMemo(() => forecastNextMonths(series, 3), [series]);
  const metrics = useMemo(() => getSelectedMetrics(records, item, market), [records, item, market]);
  const comparison = useMemo(() => getMarketComparison(records, item), [records, item]);
  const anomalies = useMemo(() => detectAnomalies(series), [series]);
  const recentAnomalies = useMemo(() => getRecentAnomalies(records, item, 5), [records, item]);
  const basketSeries = useMemo(() => getBasketSeries(records, householdSize), [records, householdSize]);
  const basketSnapshot = basketSeries[basketSeries.length - 1];
  const rolling = useMemo(() => rollingAverage(series, 3), [series]);

  const trendData = useMemo<TrendDatum[]>(
    () => {
      const actualRows: TrendDatum[] = series.map((point, index) => ({
          ...point,
          Actual: point.price,
          Forecast: index === series.length - 1 ? point.price : null,
          "3M average": rolling[index]?.price ?? point.price
        }));

      return actualRows.concat(
          forecast.map((point): TrendDatum => ({
            date: point.date,
            monthLabel: point.monthLabel,
            price: point.price,
            Actual: null,
            Forecast: point.price,
            "3M average": null
          }))
        );
    },
    [forecast, rolling, series]
  );

  const cheapest = comparison[0];
  const priciest = comparison[comparison.length - 1];
  const basketTrend = basketSeries.map((snapshot) => ({
    monthLabel: snapshot.monthLabel,
    "Basket cost": snapshot.total
  }));
  const topBasketContributors = basketSnapshot?.contributions.slice(0, 7) ?? [];
  const readout = priceReadout(records, item, market, metrics);

  return (
    <main className="min-h-screen px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="grid gap-4 border-b-2 border-ink pb-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-sm bg-leaf text-paper">
                <Sprout size={23} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-saffron">
                  Sri Lanka food price monitor
                </p>
                <h1 className="font-display text-4xl font-semibold leading-none text-ink sm:text-5xl">
                  PricePulse LK
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-base font-medium text-ink/70">
              Food price intelligence for Sri Lanka
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "focus-ring rounded-sm border px-3 py-2 text-sm font-semibold transition",
                  activeTab === tab
                    ? "border-leaf bg-leaf text-paper"
                    : "border-ink/15 bg-paper text-ink/70 hover:border-leaf/45 hover:text-leaf"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-4 rounded-md border border-ink/15 bg-paper/95 p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto] lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <label className="grid gap-1 text-sm font-semibold text-ink/70">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/50">
                <Search size={13} />
                Item
              </span>
              <select
                value={item}
                onChange={(event) => setItem(event.target.value as FoodItem)}
                className="focus-ring h-11 rounded-sm border border-ink/15 bg-field px-3 text-base font-semibold text-ink"
              >
                {ITEMS.map((entry) => (
                  <option key={entry.item} value={entry.item}>
                    {entry.item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-ink/70">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/50">
                <MapPin size={13} />
                Market
              </span>
              <select
                value={market}
                onChange={(event) => setMarket(event.target.value as MarketName)}
                className="focus-ring h-11 rounded-sm border border-ink/15 bg-field px-3 text-base font-semibold text-ink"
              >
                {MARKETS.map((entry) => (
                  <option key={entry.market} value={entry.market}>
                    {entry.market}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-ink/70">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink/50">
                <SlidersHorizontal size={13} />
                Date range
              </span>
              <select
                value={rangeMonths}
                onChange={(event) => setRangeMonths(Number(event.target.value))}
                className="focus-ring h-11 rounded-sm border border-ink/15 bg-field px-3 text-base font-semibold text-ink"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Last {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid min-w-36 content-end">
              <div className="rounded-sm border border-ink/15 bg-leaf px-4 py-2 text-paper">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-paper/65">Latest sample</p>
                <p className="font-display text-xl font-semibold">{series.at(-1)?.monthLabel ?? "No data"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Latest price"
            value={formatCurrency(metrics.latestPrice)}
            detail={`Per ${unit} in ${market}. 3-month average: ${formatCurrency(metrics.rollingAverage3)}.`}
            trend={metrics.momChangePct}
            tone={metrics.momChangePct > 8 ? "danger" : "neutral"}
            icon={TrendingUp}
          />
          <MetricTile
            label="Volatility"
            value={metrics.volatility.label}
            detail={`Recent standard movement is ${metrics.volatility.score.toFixed(1)} percentage points.`}
            tone={metrics.volatility.label === "High" ? "danger" : metrics.volatility.label === "Moderate" ? "warn" : "good"}
            icon={BarChart3}
          />
          <MetricTile
            label="Forecast next month"
            value={forecast[0] ? formatCurrency(forecast[0].price) : "n/a"}
            detail={`Short-range estimate based on trend and smoothing, shown for ${forecast[0]?.monthLabel ?? "next month"}.`}
            trend={forecast[0] ? ((forecast[0].price - metrics.latestPrice) / metrics.latestPrice) * 100 : undefined}
            tone="neutral"
            icon={LineChartIcon}
          />
          <MetricTile
            label="Market rank"
            value={`${metrics.marketRank}/${metrics.marketsCount}`}
            detail={`${market} compared by latest ${item.toLowerCase()} price. Median: ${formatCurrency(metrics.marketMedian)}.`}
            tone={metrics.marketRank <= 2 ? "good" : metrics.marketRank >= 7 ? "danger" : "neutral"}
            icon={MapPin}
          />
        </section>

        {activeTab === "Trend" ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
            <div className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
              <SectionHeader
                eyebrow="Commodity detail"
                title={`${item} in ${market}`}
                note="Actual price, 3-month rolling average, forecast, and detected unusual moves."
              />
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 14, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid className="chart-grid" vertical={false} />
                    <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={78}
                      tickFormatter={compactLkrAxis}
                      domain={["dataMin - 30", "dataMax + 30"]}
                    />
                    <Tooltip content={<PriceTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Actual"
                      stroke="#0f4a35"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="3M average"
                      stroke="#d89b22"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Forecast"
                      stroke="#a5472d"
                      strokeWidth={2.5}
                      strokeDasharray="7 6"
                      dot={{ r: 3 }}
                      connectNulls
                    />
                    {anomalies.map((point) => (
                      <ReferenceDot
                        key={`${point.date}-${point.score}`}
                        x={point.monthLabel}
                        y={point.price}
                        r={6}
                        fill="#b7352d"
                        stroke="#fffaf0"
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <div className="border-l-4 border-leaf bg-field px-3 py-2">
                  <p className="font-semibold text-ink">Cheapest market</p>
                  <p className="text-ink/65">
                    {cheapest?.market} at {cheapest ? formatCurrency(cheapest.price) : "n/a"}
                  </p>
                </div>
                <div className="border-l-4 border-clay bg-field px-3 py-2">
                  <p className="font-semibold text-ink">Highest market</p>
                  <p className="text-ink/65">
                    {priciest?.market} at {priciest ? formatCurrency(priciest.price) : "n/a"}
                  </p>
                </div>
                <div className="border-l-4 border-saffron bg-field px-3 py-2">
                  <p className="font-semibold text-ink">Seasonal note</p>
                  <p className="text-ink/65">{seasonalInsight(item, metrics)}</p>
                </div>
              </div>
            </div>

            <aside className="grid gap-5">
              <section className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
                <SectionHeader eyebrow="Explanation" title="Plain-English readout" />
                <p className="text-base leading-7 text-ink/75">{readout}</p>
              </section>

              <section className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
                <SectionHeader eyebrow="Alerts" title="Unusual movement" />
                <div className="space-y-3">
                  {recentAnomalies.length > 0 ? (
                    recentAnomalies.map((alert) => (
                      <div key={`${alert.market}-${alert.date}-${alert.score}`} className="flex gap-3 border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-danger/10 text-danger">
                          <AlertTriangle size={17} />
                        </span>
                        <div>
                          <p className="font-semibold text-ink">
                            {alert.market}, {alert.monthLabel}
                          </p>
                          <p className="text-sm leading-snug text-ink/65">
                            {formatCurrency(alert.price)} is a {alert.direction === "up" ? "high" : "low"} outlier with score{" "}
                            {alert.score.toFixed(1)}.
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-sm bg-field p-3 text-sm text-ink/65">
                      No unusual movement detected for the selected range.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
                <SectionHeader eyebrow="Markets" title="Latest spread" />
                <div className="h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparison} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid className="chart-grid" vertical={false} />
                      <XAxis dataKey="market" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip content={<PriceTooltip />} />
                      <Bar dataKey="price" name="Price" radius={[3, 3, 0, 0]}>
                        {comparison.map((row) => (
                          <Cell key={row.market} fill={row.market === market ? "#d89b22" : "#0f4a35"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {activeTab === "Markets" ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
              <SectionHeader
                eyebrow="Market comparison"
                title={`${item} across tracked markets`}
                note="Ranked by latest price, with each market measured against the national median."
              />
              <div className="h-[390px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comparison} margin={{ top: 16, right: 20, bottom: 4, left: 0 }}>
                    <CartesianGrid className="chart-grid" vertical={false} />
                    <XAxis dataKey="market" tickLine={false} axisLine={false} interval={0} />
                    <YAxis yAxisId="price" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                    <YAxis yAxisId="delta" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip content={<MarketTooltip />} />
                    <Bar yAxisId="price" dataKey="price" name="Latest price" radius={[3, 3, 0, 0]}>
                      {comparison.map((row) => (
                        <Cell key={row.market} fill={row.deltaPct > 4 ? "#a5472d" : row.deltaPct < -4 ? "#54705a" : "#d89b22"} />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="delta"
                      type="monotone"
                      dataKey="deltaPct"
                      name="Median delta"
                      stroke="#211f1a"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#211f1a" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
              <SectionHeader eyebrow="Ranking table" title="Above or below median" />
              <div className="overflow-hidden rounded-sm border border-ink/12">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-leaf text-paper">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Rank</th>
                      <th className="px-3 py-2 font-semibold">Market</th>
                      <th className="px-3 py-2 font-semibold">Price</th>
                      <th className="px-3 py-2 font-semibold">Median gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row) => (
                      <tr key={row.market} className={cn("border-b border-ink/10 last:border-0", row.market === market && "bg-saffron/10")}>
                        <td className="px-3 py-3 font-semibold text-ink">{row.rank}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-ink">{row.market}</p>
                          <p className="text-xs text-ink/52">{row.province}</p>
                        </td>
                        <td className="px-3 py-3 font-semibold text-ink">{formatCurrency(row.price)}</td>
                        <td className={cn("px-3 py-3 font-semibold", row.deltaPct > 0 ? "text-danger" : "text-leaf")}>
                          {formatPct(row.deltaPct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "Basket" ? (
          <section className="mt-5 grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
              <SectionHeader eyebrow="Food basket index" title="Household estimate" />
              <label className="grid gap-3 rounded-sm bg-field p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <Calculator size={17} />
                    Household size
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={householdSize}
                    onChange={(event) => setHouseholdSize(Number(event.target.value))}
                    className="focus-ring h-10 w-20 rounded-sm border border-ink/15 bg-paper px-2 text-center font-semibold"
                  />
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={householdSize}
                  onChange={(event) => setHouseholdSize(Number(event.target.value))}
                  className="accent-leaf"
                />
              </label>

              <div className="mt-5 rounded-sm bg-leaf p-4 text-paper">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-paper/60">Latest basket</p>
                <p className="font-display text-4xl font-semibold">{formatCurrency(basketSnapshot?.total ?? 0)}</p>
                <p className="mt-2 text-sm text-paper/75">
                  {basketSnapshot?.changePct === null || basketSnapshot?.changePct === undefined
                    ? "No previous month comparison"
                    : `${formatPct(basketSnapshot.changePct)} from previous month`}
                </p>
              </div>

              <p className="mt-4 text-base leading-7 text-ink/72">{basketSnapshot ? basketReadout(basketSnapshot) : "No basket data available."}</p>
            </div>

            <div className="grid gap-5">
              <section className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
                <SectionHeader eyebrow="Cost trend" title="Monthly staple basket" />
                <div className="h-[290px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={basketTrend} margin={{ top: 12, right: 16, bottom: 2, left: 0 }}>
                      <defs>
                        <linearGradient id="basketFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#0f4a35" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#0f4a35" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid className="chart-grid" vertical={false} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                      <Tooltip content={<PercentTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="Basket cost"
                        stroke="#0f4a35"
                        strokeWidth={3}
                        fill="url(#basketFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-md border border-ink/15 bg-paper p-4 shadow-sm">
                <SectionHeader eyebrow="Contributors" title="What moved the basket" />
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBasketContributors} layout="vertical" margin={{ top: 6, right: 28, bottom: 0, left: 10 }}>
                      <CartesianGrid className="chart-grid" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                      <YAxis type="category" dataKey="item" tickLine={false} axisLine={false} width={92} />
                      <Tooltip content={<PriceTooltip />} />
                      <Bar dataKey="cost" name="Cost" radius={[0, 3, 3, 0]}>
                        {topBasketContributors.map((entry) => (
                          <Cell key={entry.item} fill={entry.change > 0 ? "#d89b22" : "#54705a"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {activeTab === "Method" ? (
          <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-md border border-ink/15 bg-paper p-5 shadow-sm">
              <SectionHeader eyebrow="Methodology" title="How the prototype reads prices" />
              <div className="space-y-4 text-sm leading-7 text-ink/72">
                <p>
                  The MVP uses a deterministic local seed dataset for 24 months of monthly prices across 10 staple items and 8 Sri Lankan markets. It is structured so WFP/HDX food prices, Department of Census and Statistics releases, Central Bank exchange rates, or World Bank series can replace the seed layer later.
                </p>
                <p>
                  Calculations include month-on-month change, 3-month rolling average, 6-month average, volatility from recent percentage changes, robust anomaly detection using median absolute deviation, market median comparison, and a short-range forecast blended from linear trend and exponential smoothing.
                </p>
                <p>
                  This is a portfolio prototype for analysis and product demonstration. It is not an official statistical release or financial advice.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-ink/15 bg-paper p-5 shadow-sm">
              <SectionHeader eyebrow="Architecture" title="Built for clean replacement data" />
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Seed data", "src/lib/prices/seed-data.ts"],
                  ["Analytics", "src/lib/prices/analytics.ts"],
                  ["Forecasting", "src/lib/prices/forecast.ts"],
                  ["Explanations", "src/lib/prices/explanations.ts"],
                  ["Types", "src/lib/prices/types.ts"],
                  ["Dashboard UI", "src/components/dashboard/PricePulseDashboard.tsx"]
                ].map(([title, path]) => (
                  <div key={path} className="rounded-sm border border-ink/12 bg-field p-3">
                    <p className="inline-flex items-center gap-2 font-semibold text-ink">
                      <Database size={15} />
                      {title}
                    </p>
                    <p className="mt-1 break-words text-xs text-ink/55">{path}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
