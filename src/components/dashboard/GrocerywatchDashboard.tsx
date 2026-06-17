"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calculator,
  ChevronDown,
  Database,
  LineChart as LineChartIcon,
  MapPin,
  Package,
  Search,
  Settings,
  ShoppingBasket,
  Store,
  TrendingUp,
  UserRound
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
  Pie,
  PieChart,
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
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
  { label: "18M", value: 18 },
  { label: "24M", value: 24 }
];

const NAV_ITEMS = [
  { tab: "Trend", label: "Overview", icon: BarChart3 },
  { tab: "Markets", label: "Markets", icon: Store },
  { tab: "Basket", label: "Basket", icon: ShoppingBasket },
  { tab: "Method", label: "Method", icon: Database }
] as const;

const GROCERY_COLORS = ["#111827", "#176b87", "#f59e0b", "#d92d20", "#7a8f3a", "#475467"];

const FOOD_ICONS: Record<FoodItem, string> = {
  Rice: "🍚",
  Dhal: "🫘",
  Coconut: "🥥",
  Eggs: "🥚",
  Chicken: "🍗",
  Fish: "🐟",
  Flour: "🌾",
  Sugar: "◻",
  "Milk Powder": "🥛",
  Onion: "🧅"
};

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
    <div className="rounded-2xl border border-[#e6e9ef] bg-white px-4 py-3 text-xs shadow-[0_18px_50px_rgba(16,24,40,0.14)]">
      <p className="mb-2 font-bold text-[#101114]">{label}</p>
      <div className="space-y-1.5">
        {payload
          .filter((entry) => entry.value !== null && entry.value !== undefined)
          .map((entry) => (
            <div key={`${entry.name}`} className="flex min-w-40 items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-[#667085]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#176b87" }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-[#101114]">{formatCurrency(Number(entry.value))}</span>
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
    <div className="rounded-2xl border border-[#e6e9ef] bg-white px-4 py-3 text-xs shadow-[0_18px_50px_rgba(16,24,40,0.14)]">
      <p className="mb-2 font-bold text-[#101114]">{label}</p>
      {payload.map((entry) => {
        const isDelta = entry.dataKey === "deltaPct";
        return (
          <div key={`${entry.name}`} className="flex min-w-40 items-center justify-between gap-5">
            <span className="text-[#667085]">{entry.name}</span>
            <span className="font-semibold text-[#101114]">
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
  const iconTone =
    tone === "danger"
      ? "bg-[#fff5f5] text-[#d92d20] border-[#fecdca]"
      : tone === "warn"
        ? "bg-[#fffbeb] text-[#f59e0b] border-[#fedf89]"
        : "bg-[#f8fafc] text-[#176b87] border-[#e6e9ef]";

  return (
    <section className="min-h-[142px] border-b border-[#e6e9ef] p-5 sm:border-b-0 sm:border-r last:sm:border-r-0">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#667085]">{label}</p>
          <p className="mt-2 text-[28px] font-bold leading-none text-[#101114]">{value}</p>
        </div>
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl border shadow-[0_10px_28px_rgba(16,24,40,0.08)]", iconTone)}>
          <Icon size={20} strokeWidth={2.4} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {trend !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              trendIsUp ? "bg-[#fff5f5] text-[#d92d20]" : "bg-[#f0fdf4] text-[#15803d]"
            )}
          >
            {trendIsUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatPct(trend)}
          </span>
        ) : null}
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#667085]">{detail}</p>
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
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold leading-tight text-[#101114]">{title}</h2>
        {note ? <p className="mt-1 max-w-xl text-sm font-semibold leading-snug text-[#667085]">{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Sidebar({
  activeTab,
  setActiveTab
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <aside className="hidden w-[268px] shrink-0 rounded-[18px] bg-[#111827] px-7 py-8 text-white shadow-[0_30px_80px_rgba(16,24,40,0.22)] lg:flex lg:flex-col">
      <div className="mb-12 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#f59e0b] text-3xl font-bold text-white">
          G
        </div>
        <div>
          <p className="text-xl font-semibold">Grocerywatch</p>
          <p className="text-xs font-bold text-white/45">.lk price monitor</p>
        </div>
      </div>

      <nav className="space-y-3">
        {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "group relative flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-left text-base font-semibold transition",
              activeTab === tab ? "text-[#f59e0b]" : "text-[#98a2b3] hover:text-white"
            )}
          >
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl", activeTab === tab ? "bg-[#f59e0b]/15" : "bg-transparent")}>
              <Icon size={21} strokeWidth={2.35} />
            </span>
            {label}
            {activeTab === tab ? <span className="absolute -right-7 h-9 w-1.5 rounded-l-full bg-[#f59e0b]" /> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-4 pt-10">
        <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Tracked basket</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {ITEMS.slice(0, 8).map((entry) => (
              <span key={entry.item} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-base" title={entry.item}>
                {FOOD_ICONS[entry.item]}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-left font-semibold text-[#98a2b3]">
          <Settings size={21} />
          Settings
        </button>
      </div>
    </aside>
  );
}

function ProductStrip({
  item,
  comparison
}: {
  item: FoodItem;
  comparison: ReturnType<typeof getMarketComparison>;
}) {
  const productCards = comparison.slice(0, 4);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {productCards.map((row, index) => (
        <article key={row.market} className="rounded-[18px] border border-[#e6e9ef] bg-white p-4 shadow-[0_10px_30px_rgba(16,24,40,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#f8fafc] text-4xl">
              <span aria-hidden="true">{FOOD_ICONS[item]}</span>
            </div>
            <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#475467]">
              {Math.abs(row.deltaPct).toFixed(0)}% {row.deltaPct >= 0 ? "above" : "below"}
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[#101114]">{formatCurrency(row.price)}</p>
          <p className="mt-1 text-sm font-bold text-[#667085]">{row.market} market</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold text-[#101114]">
              {item} price signal
            </p>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e6e9ef] bg-white text-[#176b87]">
              <Package size={19} />
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e6e9ef]">
            <div className="h-full rounded-full bg-[#176b87]" style={{ width: `${Math.min(92, 42 + index * 13)}%` }} />
          </div>
        </article>
      ))}
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
  const recentAnomalies = useMemo(() => getRecentAnomalies(records, item, 5), [records, item]);
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
  const topBasketContributors = basketSnapshot?.contributions.slice(0, 7) ?? [];
  const readout = priceReadout(records, item, market, metrics);
  const donutData = topBasketContributors.slice(0, 5).map((entry) => ({
    name: entry.item,
    value: entry.cost
  }));

  return (
    <main className="min-h-screen bg-white px-3 py-3 text-[#101114] sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[1540px] gap-6 bg-white p-3 lg:p-6">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <section className="min-w-0 flex-1 px-1 py-2 sm:px-3 lg:px-5">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#f59e0b]">Sri Lanka grocery price monitor</p>
              <h1 className="mt-2 text-[36px] font-semibold leading-none text-[#101114] sm:text-5xl">
                Grocerywatch.lk
              </h1>
              <p className="mt-2 text-base font-bold text-[#667085]">Food price intelligence for Sri Lanka</p>
            </div>

            <div className="flex items-center gap-3">
              <button className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#101114] shadow-[0_12px_30px_rgba(16,24,40,0.08)]" type="button">
                <Search size={22} />
              </button>
              <button className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-[#101114] shadow-[0_12px_30px_rgba(16,24,40,0.08)]" type="button">
                <Bell size={21} />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#d92d20]" />
              </button>
              <div className="hidden items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-[0_12px_30px_rgba(16,24,40,0.08)] sm:flex">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f8fafc] text-[#176b87]">
                  <UserRound size={20} />
                </span>
                <span className="font-semibold">Analyst</span>
                <ChevronDown size={17} className="text-[#667085]" />
              </div>
            </div>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold",
                  activeTab === tab ? "bg-[#111827] text-white" : "bg-white text-[#667085]"
                )}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          <section className="mb-5 rounded-[18px] border border-[#e6e9ef] bg-white p-4 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#667085]">
                  <Search size={14} />
                  Item
                </span>
                <select
                  value={item}
                  onChange={(event) => setItem(event.target.value as FoodItem)}
                  className="focus-ring h-12 rounded-xl border border-[#e6e9ef] bg-[#ffffff] px-4 text-base font-bold text-[#101114]"
                >
                  {ITEMS.map((entry) => (
                    <option key={entry.item} value={entry.item}>
                      {entry.item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#667085]">
                  <MapPin size={14} />
                  Market
                </span>
                <select
                  value={market}
                  onChange={(event) => setMarket(event.target.value as MarketName)}
                  className="focus-ring h-12 rounded-xl border border-[#e6e9ef] bg-[#ffffff] px-4 text-base font-bold text-[#101114]"
                >
                  {MARKETS.map((entry) => (
                    <option key={entry.market} value={entry.market}>
                      {entry.market}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#667085]">
                  <LineChartIcon size={14} />
                  Date range
                </span>
                <select
                  value={rangeMonths}
                  onChange={(event) => setRangeMonths(Number(event.target.value))}
                  className="focus-ring h-12 rounded-xl border border-[#e6e9ef] bg-[#ffffff] px-4 text-base font-bold text-[#101114]"
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Last {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid min-w-36 content-end">
                <div className="rounded-2xl bg-[#176b87] px-5 py-3 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Latest sample</p>
                  <p className="text-2xl font-bold">{series.at(-1)?.monthLabel ?? "No data"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid overflow-hidden rounded-[18px] border border-[#e6e9ef] bg-white shadow-[0_18px_50px_rgba(16,24,40,0.05)] sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Latest price"
              value={formatCurrency(metrics.latestPrice)}
              detail={`Per ${unit} in ${market}.`}
              trend={metrics.momChangePct}
              tone={metrics.momChangePct > 8 ? "danger" : "neutral"}
              icon={TrendingUp}
            />
            <MetricTile
              label="Volatility"
              value={metrics.volatility.label}
              detail={`${metrics.volatility.score.toFixed(1)} point recent movement.`}
              tone={metrics.volatility.label === "High" ? "danger" : metrics.volatility.label === "Moderate" ? "warn" : "good"}
              icon={BarChart3}
            />
            <MetricTile
              label="Forecast"
              value={forecast[0] ? formatCurrency(forecast[0].price) : "n/a"}
              detail={`${forecast[0]?.monthLabel ?? "Next month"} estimate.`}
              trend={forecast[0] ? ((forecast[0].price - metrics.latestPrice) / metrics.latestPrice) * 100 : undefined}
              tone="neutral"
              icon={LineChartIcon}
            />
            <MetricTile
              label="Market rank"
              value={`${metrics.marketRank}/${metrics.marketsCount}`}
              detail={`Median: ${formatCurrency(metrics.marketMedian)}.`}
              tone={metrics.marketRank <= 2 ? "good" : metrics.marketRank >= 7 ? "danger" : "neutral"}
              icon={MapPin}
            />
          </section>

          {activeTab === "Trend" ? (
            <div className="grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
              <section className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                <SectionHeader
                  title={`${item} analytics`}
                  note={`${market} price trend, rolling average, forecast, and unusual movements.`}
                  action={
                    <div className="flex items-center gap-4 text-xs font-bold text-[#101114]">
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#111827]" />Actual</span>
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />Rolling</span>
                    </div>
                  }
                />
                <div className="h-[372px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 14, right: 16, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e6e9ef" vertical={false} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickFormatter={compactLkrAxis}
                        domain={["dataMin - 30", "dataMax + 30"]}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Line type="monotone" dataKey="Actual" stroke="#111827" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="3M average" stroke="#f59e0b" strokeWidth={2.6} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="Forecast"
                        stroke="#176b87"
                        strokeWidth={2.6}
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
                          fill="#d92d20"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <aside className="grid gap-6">
                <section className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                  <SectionHeader title="Basket mix" />
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={92} paddingAngle={5}>
                          {donutData.map((entry, index) => (
                            <Cell key={entry.name} fill={GROCERY_COLORS[index % GROCERY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PriceTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="-mt-2 text-center text-3xl font-bold text-[#344054]">{basketSnapshot ? formatCurrency(basketSnapshot.total) : "n/a"}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-bold text-[#667085]">
                    {donutData.slice(0, 3).map((entry, index) => (
                      <span key={entry.name} className="flex items-center gap-2">
                        <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GROCERY_COLORS[index] }} />
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                  <SectionHeader title="Explanation" />
                  <p className="text-base font-semibold leading-8 text-[#475467]">{readout}</p>
                </section>
              </aside>

              <section className="xl:col-span-2">
                <ProductStrip item={item} comparison={comparison} />
              </section>

              <section className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)] xl:col-span-2">
                <SectionHeader title="Recent alerts" note="Detected outliers across tracked markets." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {recentAnomalies.map((alert) => (
                    <div key={`${alert.market}-${alert.date}-${alert.score}`} className="rounded-2xl bg-[#fff5f5] p-4">
                      <AlertTriangle className="mb-3 text-[#d92d20]" size={21} />
                      <p className="font-bold text-[#101114]">{alert.market}</p>
                      <p className="text-sm font-bold text-[#667085]">{alert.monthLabel}</p>
                      <p className="mt-2 text-sm font-semibold text-[#d92d20]">{formatCurrency(alert.price)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "Markets" ? (
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                <SectionHeader title={`${item} by market`} note="Ranking against the current national median." />
                <div className="h-[430px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={comparison} margin={{ top: 16, right: 20, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e6e9ef" vertical={false} />
                      <XAxis dataKey="market" tickLine={false} axisLine={false} interval={0} />
                      <YAxis yAxisId="price" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                      <YAxis yAxisId="delta" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip content={<MarketTooltip />} />
                      <Bar yAxisId="price" dataKey="price" name="Latest price" radius={[10, 10, 0, 0]}>
                        {comparison.map((row) => (
                          <Cell key={row.market} fill={row.market === market ? "#f59e0b" : "#176b87"} />
                        ))}
                      </Bar>
                      <Line yAxisId="delta" type="monotone" dataKey="deltaPct" name="Median delta" stroke="#111827" strokeWidth={3} dot={{ r: 4, fill: "#111827" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-[18px] border border-[#e6e9ef] bg-white shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                <div className="p-5">
                  <SectionHeader title="Market list" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead className="text-[#667085]">
                      <tr>
                        <th className="px-5 py-3 font-bold">No</th>
                        <th className="px-5 py-3 font-bold">Market</th>
                        <th className="px-5 py-3 font-bold">Price</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((row) => (
                        <tr key={row.market} className="border-t border-[#e6e9ef]">
                          <td className="px-5 py-4 font-bold">{row.rank}</td>
                          <td className="px-5 py-4">
                            <p className="font-bold text-[#101114]">{row.market}</p>
                            <p className="text-xs font-bold text-[#667085]">{row.province}</p>
                          </td>
                          <td className="px-5 py-4 font-bold">{formatCurrency(row.price)}</td>
                          <td className="px-5 py-4">
                            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", row.deltaPct > 0 ? "bg-[#fff5f5] text-[#d92d20]" : "bg-[#f8fafc] text-[#176b87]")}>
                              {formatPct(row.deltaPct)}
                            </span>
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
            <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                <SectionHeader title="Household basket" note="Monthly staple estimate by household size." />
                <label className="grid gap-4 rounded-[16px] bg-[#f8fafc] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#101114]">
                      <Calculator size={18} />
                      Household size
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={householdSize}
                      onChange={(event) => setHouseholdSize(Number(event.target.value))}
                      className="focus-ring h-12 w-24 rounded-2xl border border-[#e6e9ef] bg-white px-3 text-center font-bold"
                    />
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={householdSize}
                    onChange={(event) => setHouseholdSize(Number(event.target.value))}
                    className="accent-[#176b87]"
                  />
                </label>
                <div className="mt-5 rounded-[18px] bg-[#111827] p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Latest basket</p>
                  <p className="mt-2 text-4xl font-bold">{formatCurrency(basketSnapshot?.total ?? 0)}</p>
                  <p className="mt-2 text-sm font-bold text-white/65">
                    {basketSnapshot?.changePct === null || basketSnapshot?.changePct === undefined
                      ? "No previous month comparison"
                      : `${formatPct(basketSnapshot.changePct)} from previous month`}
                  </p>
                </div>
                <p className="mt-5 text-base font-semibold leading-8 text-[#475467]">{basketSnapshot ? basketReadout(basketSnapshot) : "No basket data available."}</p>
              </div>

              <div className="grid gap-6">
                <section className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                  <SectionHeader title="Basket trend" />
                  <div className="h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={basketTrend} margin={{ top: 12, right: 16, bottom: 2, left: 0 }}>
                        <defs>
                          <linearGradient id="basketFillNew" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#176b87" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#176b87" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e6e9ef" vertical={false} />
                        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                        <Tooltip content={<PriceTooltip />} />
                        <Area type="monotone" dataKey="Basket cost" stroke="#176b87" strokeWidth={3} fill="url(#basketFillNew)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-[18px] border border-[#e6e9ef] bg-white p-5 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                  <SectionHeader title="Top contributors" />
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topBasketContributors} layout="vertical" margin={{ top: 6, right: 28, bottom: 0, left: 10 }}>
                        <CartesianGrid stroke="#e6e9ef" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                        <YAxis type="category" dataKey="item" tickLine={false} axisLine={false} width={92} />
                        <Tooltip content={<PriceTooltip />} />
                        <Bar dataKey="cost" name="Cost" radius={[0, 12, 12, 0]}>
                          {topBasketContributors.map((entry, index) => (
                            <Cell key={entry.item} fill={GROCERY_COLORS[index % GROCERY_COLORS.length]} />
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
            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[18px] border border-[#e6e9ef] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                <SectionHeader title="Methodology" />
                <div className="space-y-4 text-sm font-semibold leading-7 text-[#475467]">
                  <p>
                    Grocerywatch.lk currently uses a deterministic local dataset covering 24 months, 10 food items, and 8 Sri Lankan markets. The data layer is isolated so open datasets can replace the seed records cleanly.
                  </p>
                  <p>
                    Calculations include month-on-month change, rolling average, volatility, robust anomaly detection, market median comparison, and a short-range forecast using trend plus exponential smoothing.
                  </p>
                  <p>This is a portfolio prototype, not an official statistical release or financial advice.</p>
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e6e9ef] bg-white p-6 shadow-[0_18px_50px_rgba(16,24,40,0.05)]">
                <SectionHeader title="Architecture" />
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Seed data", "src/lib/prices/seed-data.ts"],
                    ["Analytics", "src/lib/prices/analytics.ts"],
                    ["Forecasting", "src/lib/prices/forecast.ts"],
                    ["Explanations", "src/lib/prices/explanations.ts"],
                    ["Types", "src/lib/prices/types.ts"],
                    ["Dashboard UI", "src/components/dashboard/GrocerywatchDashboard.tsx"]
                  ].map(([title, path]) => (
                    <div key={path} className="rounded-2xl border border-[#e6e9ef] bg-[#ffffff] p-4">
                      <p className="inline-flex items-center gap-2 font-bold text-[#101114]">
                        <Database size={16} />
                        {title}
                      </p>
                      <p className="mt-2 break-words text-xs font-bold text-[#667085]">{path}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}



