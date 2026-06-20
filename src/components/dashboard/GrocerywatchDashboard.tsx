"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronDown,
  Eye,
  Info,
  MessageSquareText,
  ShoppingCart,
  Tag,
  TrendingUp,
  UserRound
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
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
  getSelectedMetrics,
  getSeries,
  rollingAverage
} from "@/lib/prices/analytics";
import { basketReadout, priceReadout } from "@/lib/prices/explanations";
import { forecastNextMonths } from "@/lib/prices/forecast";
import { DEFAULT_ITEM, DEFAULT_MARKET, ITEMS, MARKETS, PRICE_RECORDS } from "@/lib/prices/seed-data";
import type { FoodItem, MarketName } from "@/lib/prices/types";

type Tab = "Trend" | "Markets" | "Basket" | "Method";

type TrendDatum = {
  date: string;
  monthLabel: string;
  price: number;
  Actual: number | null;
  Forecast: number | null;
  "3M average": number | null;
};

const RANGE_OPTIONS = [
  { label: "Past 6 Months", value: 6 },
  { label: "Past 12 Months", value: 12 },
  { label: "Past 18 Months", value: 18 },
  { label: "Past 24 Months", value: 24 }
];

const NAV_ITEMS = [
  { tab: "Trend", label: "Dashboard" },
  { tab: "Markets", label: "Markets" },
  { tab: "Basket", label: "Basket" },
  { tab: "Method", label: "Methodology & Data" }
] as const;

const BASKET_COLORS = ["#f4b41a", "#3d5a80", "#f2cc8f", "#81b29a", "#e07a5f"];

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
    <div className="rounded-sm border border-[#23395b] bg-[#0f1f38] px-3 py-2 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-[#f1f5f9]">{label}</p>
      <div className="space-y-1.5">
        {payload
          .filter((entry) => entry.value !== null && entry.value !== undefined)
          .map((entry) => (
            <div key={`${entry.name}`} className="flex min-w-40 items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-[#94a3b8]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#f4b41a" }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-[#f1f5f9]">{formatCurrency(Number(entry.value))}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function MarketTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-sm border border-[#23395b] bg-[#0f1f38] px-3 py-2 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-[#f1f5f9]">{label}</p>
      {payload.map((entry) => {
        const isDelta = entry.dataKey === "deltaPct";
        return (
          <div key={`${entry.name}`} className="flex min-w-40 items-center justify-between gap-5">
            <span className="text-[#94a3b8]">{entry.name}</span>
            <span className="font-semibold text-[#f1f5f9]">
              {isDelta ? formatPct(Number(entry.value)) : formatCurrency(Number(entry.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniBars({ tone = "primary", reverse = false }: { tone?: "primary" | "danger" | "green"; reverse?: boolean }) {
  const heights = reverse ? [90, 84, 70, 64, 58, 46, 38] : [36, 45, 42, 56, 62, 74, 88];
  const color =
    tone === "danger" ? "bg-[#e07a5f]" : tone === "green" ? "bg-[#81b29a]" : "bg-[#f4b41a]";

  return (
    <div className="flex h-9 w-16 items-end gap-[3px]">
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={cn("w-full rounded-t-[1px]", color, index < 4 && "opacity-35", index === 4 && "opacity-55", index === 5 && "opacity-75")}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  bars
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Tag;
  tone?: "primary" | "danger" | "green";
  bars?: "up" | "down" | "mixed";
}) {
  const color = tone === "danger" ? "text-[#e07a5f]" : tone === "green" ? "text-[#81b29a]" : "text-[#f4b41a]";

  return (
    <section className="rounded-sm border border-[#23395b] bg-[#152847] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">{label}</h3>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("text-3xl font-bold leading-none text-[#f1f5f9]", tone && color)}>{value}</p>
          <p className="mt-1 text-xs text-[#94a3b8]">{detail}</p>
        </div>
        {bars ? <MiniBars tone={tone} reverse={bars === "down"} /> : null}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  note,
  action
}: {
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#23395b] p-4">
      <div>
        <h2 className="text-lg font-semibold leading-tight text-[#f1f5f9]">{title}</h2>
        {note ? <p className="mt-1 text-xs text-[#94a3b8]">{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function GrocerywatchDashboard() {
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
  const basketSeries = useMemo(() => getBasketSeries(records, householdSize), [records, householdSize]);
  const basketSnapshot = basketSeries[basketSeries.length - 1];
  const rolling = useMemo(() => rollingAverage(series, 3), [series]);

  const trendData = useMemo<TrendDatum[]>(() => {
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
  }, [forecast, rolling, series]);

  const basketTrend = basketSeries.map((snapshot) => ({
    monthLabel: snapshot.monthLabel,
    "Basket cost": snapshot.total
  }));
  const topBasketContributors = basketSnapshot?.contributions.slice(0, 5) ?? [];
  const readout = priceReadout(records, item, market, metrics);
  const latestMonth = series.at(-1)?.monthLabel ?? "No data";
  const forecastDelta = forecast[0] ? ((forecast[0].price - metrics.latestPrice) / metrics.latestPrice) * 100 : 0;

  return (
    <main className="min-h-screen bg-[#0f1f38] text-[#f1f5f9]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#23395b] bg-[#152847] px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#f4b41a] text-xl font-bold text-[#0f1f38]">
            G
          </div>
          <span className="text-lg font-semibold tracking-tight">Grocerywatch.lk</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-[#94a3b8] md:flex">
          {NAV_ITEMS.map((entry) => (
            <button
              key={entry.tab}
              type="button"
              onClick={() => setActiveTab(entry.tab)}
              className={cn("transition-colors hover:text-[#f1f5f9]", activeTab === entry.tab && "text-[#f4b41a]")}
            >
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button className="text-[#94a3b8] transition-colors hover:text-[#f1f5f9]" type="button" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-sm border border-[#23395b] bg-[#1d2d44] text-[#cbd5e1]">
            <UserRound className="h-5 w-5" />
          </div>
        </div>
      </header>

      <section className="sticky top-14 z-20 flex flex-col gap-3 border-b border-[#23395b] bg-[#0f1f38] px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:px-6">
        <div className="flex flex-1 flex-wrap gap-3">
          <label className="relative min-w-[210px]">
            <select
              value={item}
              onChange={(event) => setItem(event.target.value as FoodItem)}
              className="h-9 w-full appearance-none rounded-sm border border-[#23395b] bg-[#152847] px-3 pr-9 text-sm font-medium text-[#f1f5f9] outline-none transition focus:border-[#f4b41a]"
            >
              {ITEMS.map((entry) => (
                <option key={entry.item} value={entry.item}>
                  {entry.item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
          </label>

          <label className="relative min-w-[210px]">
            <select
              value={market}
              onChange={(event) => setMarket(event.target.value as MarketName)}
              className="h-9 w-full appearance-none rounded-sm border border-[#23395b] bg-[#152847] px-3 pr-9 text-sm font-medium text-[#f1f5f9] outline-none transition focus:border-[#f4b41a]"
            >
              {MARKETS.map((entry) => (
                <option key={entry.market} value={entry.market}>
                  {entry.market}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
          </label>

          <label className="relative min-w-[180px]">
            <select
              value={rangeMonths}
              onChange={(event) => setRangeMonths(Number(event.target.value))}
              className="h-9 w-full appearance-none rounded-sm border border-[#23395b] bg-[#152847] px-3 pr-9 text-sm font-medium text-[#f1f5f9] outline-none transition focus:border-[#f4b41a]"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <CalendarDays className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
          </label>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
          <Info className="h-4 w-4" />
          Last updated: {latestMonth}, 08:30 AM
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto border-b border-[#23395b] bg-[#0f1f38] px-4 py-3 md:hidden">
        {NAV_ITEMS.map((entry) => (
          <button
            key={entry.tab}
            type="button"
            onClick={() => setActiveTab(entry.tab)}
            className={cn(
              "shrink-0 rounded-sm border px-3 py-2 text-xs font-semibold",
              activeTab === entry.tab
                ? "border-[#f4b41a] bg-[#23395b] text-[#f4b41a]"
                : "border-[#23395b] bg-[#152847] text-[#94a3b8]"
            )}
          >
            {entry.label}
          </button>
        ))}
      </section>

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:gap-6 lg:p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
          <MetricCard
            label="Latest Retail Price"
            value={formatCurrency(metrics.latestPrice)}
            detail={`per ${unit}`}
            icon={Tag}
            bars="up"
          />
          <MetricCard
            label="MoM Change"
            value={formatPct(metrics.momChangePct)}
            detail="vs last month"
            icon={TrendingUp}
            tone="danger"
            bars="up"
          />
          <MetricCard
            label="Volatility Index"
            value={metrics.volatility.label}
            detail={`Score: ${Math.round(metrics.volatility.score * 10)}/100`}
            icon={Activity}
            tone="primary"
            bars="mixed"
          />
          <MetricCard
            label="30-Day Forecast"
            value={forecast[0] ? formatCurrency(forecast[0].price) : "n/a"}
            detail={forecastDelta > 0 ? "Rising pressure expected" : "Stabilizing expected"}
            icon={Eye}
            tone="green"
            bars="down"
          />
        </section>

        <section className="flex gap-4 rounded-r-sm border-y border-r border-l-4 border-y-[#23395b] border-r-[#23395b] border-l-[#f4b41a] bg-[#152847] p-4 shadow-sm lg:col-span-12">
          <MessageSquareText className="mt-0.5 h-6 w-6 shrink-0 text-[#f4b41a]" />
          <div>
            <h2 className="mb-1 text-sm font-semibold text-[#f1f5f9]">Market Intelligence Brief</h2>
            <p className="max-w-5xl text-sm leading-relaxed text-[#94a3b8]">{readout}</p>
          </div>
        </section>

        {activeTab === "Trend" ? (
          <>
            <section className="flex min-h-[420px] flex-col rounded-sm border border-[#23395b] bg-[#152847] lg:col-span-8">
              <SectionHeader
                title="Historical Price Trend"
                note="Rolling 3-month average vs monthly retail price"
                action={
                  <button className="rounded-sm border border-[#23395b] bg-[#23395b] px-3 py-1 text-xs font-medium text-[#cbd5e1]" type="button">
                    Export CSV
                  </button>
                }
              />
              <div className="relative flex-1 p-4">
                {anomalies.length > 0 ? (
                  <div className="mb-4 flex items-center gap-2 rounded-sm border border-[#e07a5f]/30 bg-[#e07a5f]/10 p-2 text-xs">
                    <AlertTriangle className="h-4 w-4 text-[#e07a5f]" />
                    <span className="text-[#f1f5f9]">
                      <strong className="font-semibold text-[#e07a5f]">Anomaly detected:</strong>{" "}
                      {anomalies.at(-1)?.monthLabel} moved outside normal volatility boundaries.
                    </span>
                  </div>
                ) : null}
                <div className="h-[330px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 16, right: 18, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#23395b" vertical={false} opacity={0.55} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={64}
                        tickFormatter={compactLkrAxis}
                        domain={["dataMin - 30", "dataMax + 30"]}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Line type="monotone" dataKey="Actual" stroke="#f4b41a" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="3M average" stroke="#f2cc8f" strokeWidth={1.8} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="Forecast"
                        stroke="#81b29a"
                        strokeWidth={2}
                        strokeDasharray="7 6"
                        dot={{ r: 3 }}
                        connectNulls
                      />
                      {anomalies.map((point) => (
                        <ReferenceDot
                          key={`${point.date}-${point.score}`}
                          x={point.monthLabel}
                          y={point.price}
                          r={5}
                          fill="#e07a5f"
                          stroke="#152847"
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <aside className="flex flex-col gap-4 lg:col-span-4">
              <MarketComparison comparison={comparison} market={market} />
              <BasketCost
                householdSize={householdSize}
                setHouseholdSize={setHouseholdSize}
                basketSnapshot={basketSnapshot}
                contributors={topBasketContributors}
              />
            </aside>
          </>
        ) : null}

        {activeTab === "Markets" ? (
          <>
            <section className="min-h-[440px] rounded-sm border border-[#23395b] bg-[#152847] lg:col-span-8">
              <SectionHeader title="Market Comparison" note={`${item} across tracked Sri Lankan markets`} />
              <div className="h-[380px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comparison} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#23395b" vertical={false} opacity={0.55} />
                    <XAxis dataKey="market" tickLine={false} axisLine={false} interval={0} />
                    <YAxis yAxisId="price" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                    <YAxis yAxisId="delta" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip content={<MarketTooltip />} />
                    <Bar yAxisId="price" dataKey="price" name="Latest price" radius={[2, 2, 0, 0]}>
                      {comparison.map((row) => (
                        <Cell key={row.market} fill={row.market === market ? "#f4b41a" : "#3d5a80"} />
                      ))}
                    </Bar>
                    <Line yAxisId="delta" type="monotone" dataKey="deltaPct" name="Median delta" stroke="#e07a5f" strokeWidth={2} dot={{ r: 4, fill: "#e07a5f" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
            <div className="lg:col-span-4">
              <MarketComparison comparison={comparison} market={market} />
            </div>
          </>
        ) : null}

        {activeTab === "Basket" ? (
          <>
            <section className="rounded-sm border border-[#23395b] bg-[#152847] lg:col-span-5">
              <BasketCost
                householdSize={householdSize}
                setHouseholdSize={setHouseholdSize}
                basketSnapshot={basketSnapshot}
                contributors={topBasketContributors}
              />
            </section>
            <section className="rounded-sm border border-[#23395b] bg-[#152847] lg:col-span-7">
              <SectionHeader title="Basket Cost Trend" note="Estimated monthly essential food basket cost" />
              <div className="h-[360px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={basketTrend} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
                    <defs>
                      <linearGradient id="basketFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#f4b41a" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#f4b41a" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#23395b" vertical={false} opacity={0.55} />
                    <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                    <Tooltip content={<PriceTooltip />} />
                    <Area type="monotone" dataKey="Basket cost" stroke="#f4b41a" strokeWidth={2.4} fill="url(#basketFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "Method" ? (
          <section className="rounded-sm border border-[#23395b] bg-[#152847] lg:col-span-12">
            <SectionHeader title="Methodology & Data" note="How Grocerywatch.lk reads price movement" />
            <div className="grid gap-4 p-4 text-sm leading-7 text-[#cbd5e1] lg:grid-cols-2">
              <div className="rounded-sm border border-[#23395b] bg-[#0f1f38] p-4">
                <h3 className="mb-2 font-semibold text-[#f1f5f9]">Analytics methods</h3>
                <p>
                  The prototype calculates month-on-month price change, rolling averages, volatility,
                  market ranking, anomaly detection, and short-range forecasts from structured local
                  seed data.
                </p>
              </div>
              <div className="rounded-sm border border-[#23395b] bg-[#0f1f38] p-4">
                <h3 className="mb-2 font-semibold text-[#f1f5f9]">Data architecture</h3>
                <p>
                  The data layer is isolated in <code>src/lib/prices</code>, so WFP/HDX, DCS, CBSL, or
                  other open food price feeds can replace the seed data cleanly later.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function MarketComparison({
  comparison,
  market
}: {
  comparison: ReturnType<typeof getMarketComparison>;
  market: MarketName;
}) {
  return (
    <section className="rounded-sm border border-[#23395b] bg-[#152847]">
      <SectionHeader title="Market Comparison" note="Current market spread" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b border-[#23395b] bg-[#0f1f38]/60 text-xs uppercase text-[#94a3b8]">
            <tr>
              <th className="px-4 py-3 font-medium">Market</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23395b]">
            {comparison.map((row) => (
              <tr key={row.market} className={cn("transition-colors hover:bg-[#23395b]/35", row.market === market && "bg-[#23395b]/25")}>
                <td className="px-4 py-3 font-medium text-[#f1f5f9]">{row.market}</td>
                <td className="px-4 py-3 text-right font-semibold text-[#f1f5f9]">{formatCurrency(row.price)}</td>
                <td className={cn("px-4 py-3 text-right", row.deltaPct > 0 ? "text-[#e07a5f]" : row.deltaPct < 0 ? "text-[#81b29a]" : "text-[#94a3b8]")}>
                  {formatPct(row.deltaPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BasketCost({
  householdSize,
  setHouseholdSize,
  basketSnapshot,
  contributors
}: {
  householdSize: number;
  setHouseholdSize: (value: number) => void;
  basketSnapshot: ReturnType<typeof getBasketSeries>[number] | undefined;
  contributors: NonNullable<ReturnType<typeof getBasketSeries>[number]>["contributions"];
}) {
  const visibleContributors = contributors.slice(0, 4);

  return (
    <section className="rounded-sm border border-[#23395b] bg-[#152847] p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#f1f5f9]">Household Basket Cost</h2>
          <p className="mt-0.5 text-xs text-[#94a3b8]">Estimated monthly essential food cost</p>
        </div>
        <ShoppingCart className="h-6 w-6 text-[#f4b41a]" />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-sm border border-[#23395b] bg-[#0f1f38] p-1">
        {[2, 4, 6].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setHouseholdSize(size)}
            className={cn(
              "rounded-sm py-1.5 text-xs font-medium",
              householdSize === size ? "bg-[#23395b] text-[#f1f5f9]" : "text-[#94a3b8] hover:bg-[#23395b]/50"
            )}
          >
            {size} People
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className="text-2xl font-bold text-[#f1f5f9]">{basketSnapshot ? formatCurrency(basketSnapshot.total) : "n/a"}</p>
        {basketSnapshot?.changePct !== null && basketSnapshot?.changePct !== undefined ? (
          <span className="rounded-sm bg-[#e07a5f]/10 px-2 py-0.5 text-xs font-medium text-[#e07a5f]">
            {formatPct(basketSnapshot.changePct)} from previous month
          </span>
        ) : null}
      </div>
      <div className="mb-4 flex h-2 w-full overflow-hidden rounded-[2px] border border-[#23395b] bg-[#0f1f38]">
        {visibleContributors.map((entry, index) => (
          <span
            key={entry.item}
            className="h-full"
            style={{
              width: `${Math.max(8, entry.contributionPct)}%`,
              backgroundColor: BASKET_COLORS[index % BASKET_COLORS.length]
            }}
            title={entry.item}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-y-2 text-xs text-[#94a3b8]">
        {visibleContributors.map((entry, index) => (
          <div key={entry.item} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BASKET_COLORS[index % BASKET_COLORS.length] }} />
            {entry.item}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#94a3b8]">{basketSnapshot ? basketReadout(basketSnapshot) : "No basket data available."}</p>
    </section>
  );
}
