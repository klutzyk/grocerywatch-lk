"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CalendarDays,
  ChevronDown,
  Database,
  Eye,
  Home,
  Info,
  MessageSquareText,
  ShoppingCart,
  Tag,
  TrendingDown,
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
  ReferenceLine,
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
type Theme = "dark" | "light";

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

const BASKET_COLORS = ["#f4b41a", "#3d5a80", "#f2cc8f", "#81b29a", "#e07a5f"];
const FIGMA_MARKET_COLORS: Record<MarketName, string> = {
  Colombo: "#e77d0b",
  Kandy: "#2563eb",
  Galle: "#d9468f",
  Jaffna: "#8b5cf6",
  Anuradhapura: "#10b981",
  Kurunegala: "#f97316",
  Batticaloa: "#14b8a6",
  Matara: "#64748b"
};
const DESKTOP_CHART_MARKETS: MarketName[] = ["Colombo", "Kandy", "Kurunegala"];

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
  bars,
  theme = "dark"
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Tag;
  tone?: "primary" | "danger" | "green";
  bars?: "up" | "down" | "mixed";
  theme?: Theme;
}) {
  const color = tone === "danger" ? "text-[#e07a5f]" : tone === "green" ? "text-[#81b29a]" : "text-[#f4b41a]";
  const isLight = theme === "light";

  return (
    <section className={cn("rounded-sm border p-4", isLight ? "border-[#cbd5e1] bg-white shadow-sm" : "border-[#23395b] bg-[#152847]")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("text-xs font-semibold uppercase tracking-wider", isLight ? "text-[#475569]" : "text-[#94a3b8]")}>{label}</h3>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("text-3xl font-bold leading-none", isLight ? "text-[#071225]" : "text-[#f1f5f9]", tone && color)}>{value}</p>
          <p className={cn("mt-1 text-xs", isLight ? "text-[#475569]" : "text-[#94a3b8]")}>{detail}</p>
        </div>
        {bars ? <MiniBars tone={tone} reverse={bars === "down"} /> : null}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  note,
  action,
  theme = "dark"
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  theme?: Theme;
}) {
  const isLight = theme === "light";
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b p-4", isLight ? "border-[#cbd5e1]" : "border-[#23395b]")}>
      <div>
        <h2 className={cn("text-lg font-semibold leading-tight", isLight ? "text-[#071225]" : "text-[#f1f5f9]")}>{title}</h2>
        {note ? <p className={cn("mt-1 text-xs", isLight ? "text-[#475569]" : "text-[#94a3b8]")}>{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

function DesktopMetricCard({
  label,
  value,
  subline,
  footer,
  tone = "default",
  valueTone,
  icon: Icon,
  progress
}: {
  label: string;
  value: string;
  subline: string;
  footer: string;
  tone?: "default" | "good" | "bad" | "warning";
  valueTone?: "default" | "good" | "bad" | "warning";
  icon: typeof Activity;
  progress?: number;
}) {
  const resolvedValueTone = valueTone ?? tone;
  const toneClass =
    resolvedValueTone === "good"
      ? "text-[#00bf7a]"
      : resolvedValueTone === "bad"
        ? "text-[#df3038]"
        : resolvedValueTone === "warning"
          ? "text-[#d97706]"
          : "text-[#061129]";
  const footerClass =
    tone === "good"
      ? "text-[#00a870]"
      : tone === "bad"
        ? "text-[#ef3b3f]"
        : tone === "warning"
          ? "text-[#d97706]"
          : "text-[#58708b]";
  const progressColor = tone === "bad" ? "#e33434" : tone === "good" ? "#00a870" : "#e58900";

  return (
    <section className="rounded-[7px] border border-[#dedede] bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#58708b]">{label}</p>
        <Icon className="h-3.5 w-3.5 text-[#e58900]" />
      </div>
      <div className={cn("font-display text-[31px] font-semibold leading-none tracking-normal", toneClass)}>{value}</div>
      <p className="mt-2 text-[13px] text-[#58708b]">{subline}</p>
      <div className="my-3 h-px bg-[#e4e4e4]" />
      {progress !== undefined ? (
        <div className="mb-2 h-1 rounded-full bg-[#eef0f2]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: progressColor }} />
        </div>
      ) : null}
      <p className={cn("text-[13px]", footerClass)}>{footer}</p>
    </section>
  );
}

function DesktopPanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("rounded-[7px] border border-[#dedede] bg-white", className)}>{children}</section>;
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

  const desktopChartData = useMemo(() => {
    return series.map((point, index) => {
      const row: Record<string, string | number | null> = {
        monthLabel: point.monthLabel,
        average: rolling[index]?.price ?? point.price
      };

      DESKTOP_CHART_MARKETS.forEach((marketName) => {
        row[marketName] = getSeries(records, item, marketName)[index]?.price ?? null;
      });

      return row;
    });
  }, [item, records, rolling, series]);

  const basketTrend = basketSeries.map((snapshot) => ({
    monthLabel: snapshot.monthLabel,
    "Basket cost": snapshot.total
  }));
  const topBasketContributors = basketSnapshot?.contributions.slice(0, 5) ?? [];
  const readout = priceReadout(records, item, market, metrics);
  const latestMonth = series.at(-1)?.monthLabel ?? "No data";
  const forecastDelta = forecast[0] ? ((forecast[0].price - metrics.latestPrice) / metrics.latestPrice) * 100 : 0;
  const desktopComparison = comparison;
  const desktopMaxPrice = Math.max(...desktopComparison.map((row) => row.price), 1);
  const activeAnomalies = anomalies.slice(-3);
  const rangeLabel = rangeMonths <= 6 ? "3M" : rangeMonths <= 12 ? "6M" : "1Y";
  const mobileTrendData = trendData.slice(-12);
  const mobileNavItems = [
    { tab: "Trend" as const, label: "Signal", icon: Tag },
    { tab: "Markets" as const, label: "Markets", icon: TrendingUp },
    { tab: "Basket" as const, label: "Basket", icon: ShoppingCart },
    { tab: "Method" as const, label: "Data", icon: Info }
  ];

  return (
    <>
      <main className="min-h-screen bg-[#08182f] text-[#f1f5f9] md:hidden">
        <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-[#0f1f38] pb-24">
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[#23395b] bg-[#152847] px-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#f4b41a] text-lg font-bold text-[#0f1f38]">
                G
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Grocerywatch.lk</span>
            </div>
            <span className="rounded-[2px] border border-[#23395b] bg-[#1d2d44] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              Public beta
            </span>
          </header>

          <section className="sticky top-12 z-20 border-b border-[#23395b] bg-[#0f1f38] px-3 py-3">
            <div className="space-y-2">
              <label className="relative block">
                <select
                  value={item}
                  onChange={(event) => setItem(event.target.value as FoodItem)}
                  className="h-9 w-full appearance-none rounded-[2px] border border-[#23395b] bg-[#152847] px-3 pr-8 text-xs font-semibold text-[#f1f5f9] outline-none focus:border-[#f4b41a]"
                >
                  {ITEMS.map((entry) => (
                    <option key={entry.item} value={entry.item}>
                      {entry.item}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="relative block">
                  <select
                    value={market}
                    onChange={(event) => setMarket(event.target.value as MarketName)}
                    className="h-9 w-full appearance-none rounded-[2px] border border-[#23395b] bg-[#152847] px-3 pr-8 text-xs font-semibold text-[#f1f5f9] outline-none focus:border-[#f4b41a]"
                  >
                    {MARKETS.map((entry) => (
                      <option key={entry.market} value={entry.market}>
                        {entry.market}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                </label>
                <label className="relative block">
                  <select
                    value={rangeMonths}
                    onChange={(event) => setRangeMonths(Number(event.target.value))}
                    className="h-9 w-full appearance-none rounded-[2px] border border-[#23395b] bg-[#152847] px-3 pr-8 text-xs font-semibold text-[#f1f5f9] outline-none focus:border-[#f4b41a]"
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
              <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                <Info className="h-3.5 w-3.5" />
                Last updated: {latestMonth}, 08:30 AM
              </div>
            </div>
          </section>

          <div className="flex-1 space-y-3 px-3 py-3">
            {activeTab === "Trend" ? (
              <>
                <div className="grid gap-3">
                  <MetricCard
                    label="Latest Retail Price"
                    value={formatCurrency(metrics.latestPrice)}
                    detail={`per ${unit}`}
                    icon={Tag}
                    bars="up"
                  />
                  <MetricCard
                    label="Monthly Change"
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
                </div>

                <section className="flex gap-3 rounded-r-sm border-y border-r border-l-4 border-y-[#23395b] border-r-[#23395b] border-l-[#f4b41a] bg-[#152847] p-4">
                  <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-[#f4b41a]" />
                  <div>
                    <h2 className="mb-1 text-sm font-semibold">Market Intelligence Brief</h2>
                    <p className="text-xs leading-5 text-[#94a3b8]">{readout}</p>
                  </div>
                </section>

                <section className="rounded-sm border border-[#23395b] bg-[#152847]">
                  <SectionHeader
                    title="Historical Price Trend"
                    note="Rolling average vs monthly retail price"
                    action={
                      <button className="rounded-sm bg-[#23395b] px-3 py-1 text-[11px] font-semibold text-[#cbd5e1]" type="button">
                        Export CSV
                      </button>
                    }
                  />
                  <div className="p-3">
                    {anomalies.length > 0 ? (
                      <div className="mb-3 flex gap-2 rounded-sm border border-[#e07a5f]/30 bg-[#e07a5f]/10 p-2 text-[11px] leading-4">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#e07a5f]" />
                        <span>
                          <strong className="text-[#e07a5f]">Anomaly detected:</strong>{" "}
                          {anomalies.at(-1)?.monthLabel} moved outside normal volatility boundaries.
                        </span>
                      </div>
                    ) : null}
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mobileTrendData} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                          <CartesianGrid stroke="#23395b" vertical={false} opacity={0.55} />
                          <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={20} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                          <Tooltip content={<PriceTooltip />} />
                          <Line type="monotone" dataKey="Actual" stroke="#f4b41a" strokeWidth={2.4} dot={false} />
                          <Line
                            type="monotone"
                            dataKey="Forecast"
                            stroke="#81b29a"
                            strokeWidth={2}
                            strokeDasharray="6 5"
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                <MarketComparison comparison={comparison} market={market} />
                <BasketCost
                  householdSize={householdSize}
                  setHouseholdSize={setHouseholdSize}
                  basketSnapshot={basketSnapshot}
                  contributors={topBasketContributors}
                />
              </>
            ) : null}

            {activeTab === "Markets" ? (
              <section className="rounded-sm border border-[#23395b] bg-[#152847]">
                <SectionHeader title="Market Comparison" note={`${item} across tracked hubs`} />
                <div className="h-[320px] p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={comparison} margin={{ top: 12, right: 0, bottom: 0, left: -18 }}>
                      <CartesianGrid stroke="#23395b" vertical={false} opacity={0.55} />
                      <XAxis dataKey="market" tickLine={false} axisLine={false} interval={0} />
                      <YAxis yAxisId="price" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                      <YAxis yAxisId="delta" orientation="right" hide />
                      <Tooltip content={<MarketTooltip />} />
                      <Bar yAxisId="price" dataKey="price" name="Latest price" radius={[2, 2, 0, 0]}>
                        {comparison.map((row) => (
                          <Cell key={row.market} fill={row.market === market ? "#f4b41a" : "#3d5a80"} />
                        ))}
                      </Bar>
                      <Line yAxisId="delta" type="monotone" dataKey="deltaPct" name="Median delta" stroke="#e07a5f" strokeWidth={2} dot={{ r: 3, fill: "#e07a5f" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <MarketComparison comparison={comparison} market={market} />
              </section>
            ) : null}

            {activeTab === "Basket" ? (
              <>
                <BasketCost
                  householdSize={householdSize}
                  setHouseholdSize={setHouseholdSize}
                  basketSnapshot={basketSnapshot}
                  contributors={topBasketContributors}
                />
                <section className="rounded-sm border border-[#23395b] bg-[#152847]">
                  <SectionHeader title="Basket Cost Trend" note="Estimated monthly essential food cost" />
                  <div className="h-[300px] p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={basketTrend} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
                        <defs>
                          <linearGradient id="mobileBasketFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#f4b41a" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#f4b41a" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#23395b" vertical={false} opacity={0.55} />
                        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={22} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                        <Tooltip content={<PriceTooltip />} />
                        <Area type="monotone" dataKey="Basket cost" stroke="#f4b41a" strokeWidth={2.4} fill="url(#mobileBasketFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === "Method" ? (
              <section className="rounded-sm border border-[#23395b] bg-[#152847]">
                <SectionHeader title="Methodology & Data" note="How Grocerywatch.lk reads price movement" />
                <div className="space-y-3 p-4 text-xs leading-6 text-[#cbd5e1]">
                  <p>
                    GroceryWatch.lk calculates monthly change, rolling averages, volatility, anomaly signals,
                    market ranking, and short-range forecasts from structured food price observations.
                  </p>
                  <p>
                    The data layer is isolated in <code>src/lib/prices</code>, so data can be updated without
                    redesigning the experience.
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-[#23395b] bg-[#0f1f38]/95 px-4 py-2 backdrop-blur">
            <div className="grid grid-cols-4 gap-2">
              {mobileNavItems.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.tab}
                    type="button"
                    onClick={() => setActiveTab(entry.tab)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-sm px-2 py-2 text-[11px] font-semibold",
                      activeTab === entry.tab ? "bg-[#152847] text-[#f4b41a]" : "text-[#94a3b8]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </main>

      <main className="hidden min-h-screen bg-[#f7f7f5] text-[#071225] md:block">
        <header className="sticky top-0 z-30 border-b border-[#e0e0dc] bg-white">
          <div className="mx-auto grid h-[54px] max-w-[1220px] grid-cols-[1fr_auto_1fr] items-center gap-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded bg-[#e58900] text-[#061129]">
                <BarChart2 className="h-3.5 w-3.5" />
              </div>
              <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">
                GroceryWatch<span className="text-[#e58900]">.lk</span>
              </span>
            </div>

            <nav className="flex items-center justify-center gap-1">
              {[
                { tab: "Trend" as const, label: "Dashboard", icon: BarChart2 },
                { tab: "Basket" as const, label: "Basket Estimator", icon: ShoppingCart },
                { tab: "Method" as const, label: "Methodology", icon: Info }
              ].map(({ tab, label, icon: Icon }) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 rounded px-4 py-2 text-sm transition-colors",
                    activeTab === tab ? "bg-[#e58900] text-[#061129]" : "text-[#58708b] hover:bg-[#efefeb] hover:text-[#071225]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </nav>

            <div />
          </div>
        </header>

        <div className="mx-auto max-w-[1220px] space-y-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative block">
                <select
                  value={item}
                  onChange={(event) => setItem(event.target.value as FoodItem)}
                  className="h-10 min-w-56 appearance-none rounded border border-[#dedede] bg-white pl-10 pr-10 text-sm font-medium text-[#071225] outline-none transition focus:border-[#e58900]"
                >
                  {ITEMS.map((entry) => (
                    <option key={entry.item} value={entry.item}>
                      {entry.item}
                    </option>
                  ))}
                </select>
                <Activity className="pointer-events-none absolute left-3 top-3.5 h-3.5 w-3.5 text-[#e58900]" />
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-3.5 w-3.5 text-[#58708b]" />
              </label>

              <label className="relative block">
                <select
                  value={market}
                  onChange={(event) => setMarket(event.target.value as MarketName)}
                  className="h-10 min-w-52 appearance-none rounded border border-[#dedede] bg-white pl-10 pr-10 text-sm font-medium text-[#071225] outline-none transition focus:border-[#e58900]"
                >
                  {MARKETS.map((entry) => (
                    <option key={entry.market} value={entry.market}>
                      {entry.market}
                    </option>
                  ))}
                </select>
                <Home className="pointer-events-none absolute left-3 top-3.5 h-3.5 w-3.5 text-[#e58900]" />
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-3.5 w-3.5 text-[#58708b]" />
              </label>

              <div className="flex h-10 items-center rounded border border-[#dedede] bg-white p-1">
                {[
                  { label: "3M", value: 6 },
                  { label: "6M", value: 12 },
                  { label: "1Y", value: 24 }
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setRangeMonths(option.value)}
                    className={cn(
                      "h-8 rounded px-4 font-mono text-xs transition-colors",
                      rangeLabel === option.label ? "bg-[#e58900] text-[#061129]" : "text-[#58708b] hover:text-[#071225]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <section className="grid grid-cols-4 gap-3">
            <DesktopMetricCard
              label="Latest Price"
              value={Math.round(metrics.latestPrice).toLocaleString()}
              subline={`LKR / ${unit} · ${latestMonth}`}
              footer={`${market} Market`}
              icon={BarChart2}
            />
            <DesktopMetricCard
              label="Monthly Change"
              value={formatPct(metrics.momChangePct)}
              subline="vs previous month"
              footer={metrics.momChangePct >= 0 ? "Upward pressure" : "Moderate decline"}
              tone={metrics.momChangePct >= 0 ? "bad" : "good"}
              icon={metrics.momChangePct >= 0 ? TrendingUp : TrendingDown}
            />
            <DesktopMetricCard
              label="Volatility"
              value={`${(metrics.volatility.score * 10).toFixed(1)}`}
              subline={`/100 · ${metrics.volatility.label}`}
              footer={`${metrics.volatility.label} volatility`}
              tone={metrics.volatility.label === "High" ? "bad" : "warning"}
              icon={Activity}
              progress={Math.min(100, metrics.volatility.score * 10)}
            />
            <DesktopMetricCard
              label="Forecast · 30D"
              value={forecast[0] ? Math.round(forecast[0].price).toLocaleString() : "n/a"}
              subline={`LKR / ${unit} · projected`}
              footer={`${formatPct(forecastDelta)} projected ${forecastDelta >= 0 ? "rise" : "decline"}`}
              tone={forecastDelta >= 0 ? "bad" : "good"}
              valueTone="default"
              icon={Eye}
            />
          </section>

          {activeTab === "Trend" ? (
            <>
              <section className="grid grid-cols-[minmax(0,2fr)_minmax(330px,1fr)] items-start gap-3">
                <DesktopPanel className="min-h-[620px] p-5">
                  <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0">
                      <h2 className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
                        {item} - Historical Price Trend
                      </h2>
                      <p className="whitespace-nowrap text-sm text-[#58708b]">
                        {rangeLabel} view · LKR per {unit} · anomaly months marked
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm text-[#58708b]">
                      {DESKTOP_CHART_MARKETS.map((marketName) => (
                        <span key={marketName} className="flex items-center gap-2">
                          <span className="h-px w-5" style={{ backgroundColor: FIGMA_MARKET_COLORS[marketName] }} />
                          {marketName}
                        </span>
                      ))}
                      <span className="flex items-center gap-2">
                        <span className="h-px w-5 border-t border-dashed border-[#94a3b8]" />
                        3M avg
                      </span>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={desktopChartData} margin={{ top: 16, right: 18, bottom: 6, left: 0 }}>
                        <defs>
                          <linearGradient id="desktopPriceHue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#f2b13a" stopOpacity={0.22} />
                            <stop offset="78%" stopColor="#f2b13a" stopOpacity={0.07} />
                            <stop offset="100%" stopColor="#f2b13a" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ece9e2" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="monthLabel"
                          tick={{ fill: "#31465f", fontSize: 11, fontWeight: 500 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          tick={{ fill: "#31465f", fontSize: 11, fontWeight: 500 }}
                          tickLine={false}
                          axisLine={false}
                          width={64}
                          tickFormatter={compactLkrAxis}
                        />
                        <Tooltip content={<PriceTooltip />} />
                        <Area
                          type="monotone"
                          dataKey={DESKTOP_CHART_MARKETS[0]}
                          stroke="none"
                          fill="url(#desktopPriceHue)"
                          connectNulls
                          dot={false}
                          activeDot={false}
                        />
                        {DESKTOP_CHART_MARKETS.map((marketName) => (
                          <Line
                            key={marketName}
                            type="monotone"
                            dataKey={marketName}
                            stroke={FIGMA_MARKET_COLORS[marketName]}
                            strokeWidth={2}
                            connectNulls
                            dot={false}
                          />
                        ))}
                        <Line type="monotone" dataKey="average" stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="5 5" connectNulls dot={false} />
                        {activeAnomalies.map((point) => (
                          <ReferenceLine key={point.date} x={point.monthLabel} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-[minmax(230px,0.75fr)_minmax(0,1.25fr)] gap-3 border-t border-[#e6e3dc] pt-4">
                    <div className="rounded border border-[#ffe0a3] bg-[#fffaf0] p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#e58900]" />
                        <h3 className="font-display text-base font-semibold tracking-tight">Spike Alerts</h3>
                        <span className="ml-auto rounded bg-[#fff1cc] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#b56b00]">
                          {activeAnomalies.length} Active
                        </span>
                      </div>
                      <div className="space-y-2">
                        {activeAnomalies.length > 0 ? (
                          activeAnomalies.slice(0, 2).map((point) => (
                            <div key={point.date} className="rounded border border-[#ffd987] bg-white/70 p-2 text-xs">
                              <div className="font-semibold">{item} · {point.monthLabel}</div>
                              <div className="mt-0.5 font-mono text-[#58708b]">
                                {formatCurrency(point.price)} · score {point.score.toFixed(1)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="py-6 text-center text-sm text-[#58708b]">No anomalies in this range.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded border border-[#e6e3dc] bg-[#fbfbf9] p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-[#e58900]" />
                        <h3 className="font-display text-base font-semibold tracking-tight">Price Intelligence Brief</h3>
                        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.16em] text-[#58708b]">{item}</span>
                      </div>
                      <p className="text-sm leading-6 text-[#071225]">{readout}</p>
                      <div className="mt-3 grid grid-cols-2 gap-4 border-t border-[#e6e3dc] pt-3">
                        <div>
                          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#58708b]">3M Rolling Avg</div>
                          <div className="font-mono text-sm">{formatCurrency(metrics.rollingAverage3)}</div>
                        </div>
                        <div>
                          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#58708b]">Market Rank</div>
                          <div className="font-mono text-sm">{metrics.marketRank} / {metrics.marketsCount}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DesktopPanel>

                <DesktopPanel className="self-start p-5">
                  <h2 className="font-display text-lg font-semibold tracking-tight">Market Comparison</h2>
                  <p className="mb-4 text-sm text-[#58708b]">Current prices · ranked cheapest first</p>
                  <div className="space-y-1">
                    {desktopComparison.map((row, index) => (
                      <div key={row.market} className="flex items-center gap-3 border-b border-[#e6e3dc] py-2 last:border-0">
                        <span className="w-5 font-mono text-xs text-[#58708b]">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{row.market}</div>
                          <div className="text-xs text-[#58708b]">{row.province}</div>
                        </div>
                        <div className="mr-2 text-right">
                          <div className="font-mono text-base font-semibold tabular-nums">{Math.round(row.price).toLocaleString()}</div>
                          <div className={cn("font-mono text-xs", row.deltaPct >= 0 ? "text-[#ef4444]" : "text-[#00a870]")}>
                            {formatPct(row.deltaPct)}
                          </div>
                        </div>
                        <div className="w-16">
                          <div className="h-1.5 rounded-full bg-[#eeeeea]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(row.price / desktopMaxPrice) * 100}%`,
                                backgroundColor: FIGMA_MARKET_COLORS[row.market]
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-14">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={desktopComparison} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                        <XAxis
                          dataKey="market"
                          tick={{ fontSize: 8, fill: "#58708b", fontFamily: "JetBrains Mono" }}
                          tickFormatter={(value) => String(value).slice(0, 7)}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis hide />
                        <Tooltip content={<MarketTooltip />} />
                        <Bar dataKey="price" radius={[2, 2, 0, 0]} barSize={18}>
                          {desktopComparison.map((row) => (
                            <Cell key={row.market} fill={FIGMA_MARKET_COLORS[row.market]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </DesktopPanel>
              </section>

            </>
          ) : null}

          {activeTab === "Basket" ? (
            <section className="grid grid-cols-[minmax(360px,1fr)_minmax(0,2fr)] gap-4">
              <BasketCost
                householdSize={householdSize}
                setHouseholdSize={setHouseholdSize}
                basketSnapshot={basketSnapshot}
                contributors={topBasketContributors}
                theme="light"
              />
              <DesktopPanel>
                <SectionHeader title="Basket Cost Trend" note="Estimated monthly essential food basket cost" theme="light" />
                <div className="h-[360px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={basketTrend} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id="basketFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#e58900" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#e58900" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ece9e2" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                      <Tooltip content={<PriceTooltip />} />
                      <Area type="monotone" dataKey="Basket cost" stroke="#e58900" strokeWidth={2.4} fill="url(#basketFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </DesktopPanel>
            </section>
          ) : null}

          {activeTab === "Method" ? (
            <DesktopPanel className="max-w-4xl p-6">
              <div className="mb-5 flex items-center gap-2">
                <Database className="h-4 w-4 text-[#e58900]" />
                <h1 className="font-display text-2xl font-semibold tracking-tight">Methodology & Data Sources</h1>
              </div>
              <div className="grid gap-4 text-sm leading-7 text-[#334155]">
                <p>
                  GroceryWatch.lk calculates price movement, volatility, market ranking, anomaly alerts,
                  and short-term forecasts from structured food price observations.
                </p>
                <p>
                  Forecasts, anomaly detection, volatility, and basket estimates should be treated as analytic
                  overlays on verified source observations, not as source data.
                </p>
              </div>
            </DesktopPanel>
          ) : null}
        </div>

        <footer className="mt-6 border-t border-[#e0e0dc] py-4">
          <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-3 px-5 font-mono text-xs uppercase tracking-[0.16em] text-[#58708b]">
            <span>GroceryWatch.lk · Price intelligence for Sri Lanka</span>
            <span>Market movement · volatility · basket cost</span>
          </div>
        </footer>
      </main>
    </>
  );
}

function MarketComparison({
  comparison,
  market,
  theme = "dark"
}: {
  comparison: ReturnType<typeof getMarketComparison>;
  market: MarketName;
  theme?: Theme;
}) {
  const isLight = theme === "light";
  return (
    <section className={cn("rounded-sm border", isLight ? "border-[#cbd5e1] bg-white shadow-sm" : "border-[#23395b] bg-[#152847]")}>
      <SectionHeader title="Market Comparison" note="Current market spread" theme={theme} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className={cn("border-b text-xs uppercase", isLight ? "border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]" : "border-[#23395b] bg-[#0f1f38]/60 text-[#94a3b8]")}>
            <tr>
              <th className="px-4 py-3 font-medium">Market</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isLight ? "divide-[#cbd5e1]" : "divide-[#23395b]")}>
            {comparison.map((row) => (
              <tr key={row.market} className={cn("transition-colors", isLight ? "hover:bg-[#f1f5f9]" : "hover:bg-[#23395b]/35", row.market === market && (isLight ? "bg-[#fff7df]" : "bg-[#23395b]/25"))}>
                <td className={cn("px-4 py-3 font-medium", isLight ? "text-[#071225]" : "text-[#f1f5f9]")}>{row.market}</td>
                <td className={cn("px-4 py-3 text-right font-semibold", isLight ? "text-[#071225]" : "text-[#f1f5f9]")}>{formatCurrency(row.price)}</td>
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
  contributors,
  theme = "dark"
}: {
  householdSize: number;
  setHouseholdSize: (value: number) => void;
  basketSnapshot: ReturnType<typeof getBasketSeries>[number] | undefined;
  contributors: NonNullable<ReturnType<typeof getBasketSeries>[number]>["contributions"];
  theme?: Theme;
}) {
  const visibleContributors = contributors.slice(0, 4);
  const isLight = theme === "light";

  return (
    <section className={cn("rounded-sm border p-4", isLight ? "border-[#cbd5e1] bg-white shadow-sm" : "border-[#23395b] bg-[#152847]")}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className={cn("text-lg font-semibold", isLight ? "text-[#071225]" : "text-[#f1f5f9]")}>Household Basket Cost</h2>
          <p className={cn("mt-0.5 text-xs", isLight ? "text-[#475569]" : "text-[#94a3b8]")}>Estimated monthly essential food cost</p>
        </div>
        <ShoppingCart className="h-6 w-6 text-[#f4b41a]" />
      </div>
      <div className={cn("mb-4 grid grid-cols-3 gap-1 rounded-sm border p-1", isLight ? "border-[#cbd5e1] bg-[#f1f5f9]" : "border-[#23395b] bg-[#0f1f38]")}>
        {[2, 4, 6].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setHouseholdSize(size)}
            className={cn(
              "rounded-sm py-1.5 text-xs font-medium",
              householdSize === size
                ? isLight
                  ? "bg-white text-[#071225] shadow-sm"
                  : "bg-[#23395b] text-[#f1f5f9]"
                : isLight
                  ? "text-[#64748b] hover:bg-white"
                  : "text-[#94a3b8] hover:bg-[#23395b]/50"
            )}
          >
            {size} People
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <p className={cn("text-2xl font-bold", isLight ? "text-[#071225]" : "text-[#f1f5f9]")}>{basketSnapshot ? formatCurrency(basketSnapshot.total) : "n/a"}</p>
        {basketSnapshot?.changePct !== null && basketSnapshot?.changePct !== undefined ? (
          <span className="rounded-sm bg-[#e07a5f]/10 px-2 py-0.5 text-xs font-medium text-[#e07a5f]">
            {formatPct(basketSnapshot.changePct)} from previous month
          </span>
        ) : null}
      </div>
      <div className={cn("mb-4 flex h-2 w-full overflow-hidden rounded-[2px] border", isLight ? "border-[#dbe5f2] bg-[#f1f5f9]" : "border-[#23395b] bg-[#0f1f38]")}>
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
      <div className={cn("grid grid-cols-2 gap-y-2 text-xs", isLight ? "text-[#475569]" : "text-[#94a3b8]")}>
        {visibleContributors.map((entry, index) => (
          <div key={entry.item} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BASKET_COLORS[index % BASKET_COLORS.length] }} />
            {entry.item}
          </div>
        ))}
      </div>
      <p className={cn("mt-4 text-xs leading-5", isLight ? "text-[#475569]" : "text-[#94a3b8]")}>{basketSnapshot ? basketReadout(basketSnapshot) : "No basket data available."}</p>
    </section>
  );
}
