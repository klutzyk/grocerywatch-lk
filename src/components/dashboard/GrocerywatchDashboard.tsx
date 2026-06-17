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

const GROCERY_COLORS = ["#12164a", "#ff981f", "#2789a7", "#ff7a82", "#b7cbff", "#22c55e"];

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
    <div className="rounded-2xl border border-[#dce6f6] bg-white px-4 py-3 text-xs shadow-[0_18px_50px_rgba(18,22,74,0.14)]">
      <p className="mb-2 font-bold text-[#12142e]">{label}</p>
      <div className="space-y-1.5">
        {payload
          .filter((entry) => entry.value !== null && entry.value !== undefined)
          .map((entry) => (
            <div key={`${entry.name}`} className="flex min-w-40 items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-[#7d8aaa]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? "#2789a7" }}
                />
                {entry.name}
              </span>
              <span className="font-extrabold text-[#12142e]">{formatCurrency(Number(entry.value))}</span>
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
    <div className="rounded-2xl border border-[#dce6f6] bg-white px-4 py-3 text-xs shadow-[0_18px_50px_rgba(18,22,74,0.14)]">
      <p className="mb-2 font-bold text-[#12142e]">{label}</p>
      {payload.map((entry) => {
        const isDelta = entry.dataKey === "deltaPct";
        return (
          <div key={`${entry.name}`} className="flex min-w-40 items-center justify-between gap-5">
            <span className="text-[#7d8aaa]">{entry.name}</span>
            <span className="font-extrabold text-[#12142e]">
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
      ? "bg-[#fff1f2] text-[#f5325c] border-[#ffd2db]"
      : tone === "warn"
        ? "bg-[#fff7e8] text-[#ff981f] border-[#ffe3b9]"
        : "bg-[#edf9fc] text-[#2789a7] border-[#d5edf4]";

  return (
    <section className="min-h-[142px] border-b border-[#e4ebf7] p-5 sm:border-b-0 sm:border-r last:sm:border-r-0">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#7d8aaa]">{label}</p>
          <p className="mt-2 text-[28px] font-black leading-none text-[#060815]">{value}</p>
        </div>
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl border shadow-[0_10px_28px_rgba(18,22,74,0.08)]", iconTone)}>
          <Icon size={20} strokeWidth={2.4} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {trend !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold",
              trendIsUp ? "bg-[#fff1f2] text-[#f5325c]" : "bg-[#ecfdf3] text-[#16a34a]"
            )}
          >
            {trendIsUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {formatPct(trend)}
          </span>
        ) : null}
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#6f7d9f]">{detail}</p>
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
        <h2 className="text-2xl font-black leading-tight text-[#060815]">{title}</h2>
        {note ? <p className="mt-1 max-w-xl text-sm font-semibold leading-snug text-[#7d8aaa]">{note}</p> : null}
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
    <aside className="hidden w-[268px] shrink-0 rounded-[28px] bg-[#101346] px-7 py-8 text-white shadow-[0_30px_80px_rgba(16,19,70,0.22)] lg:flex lg:flex-col">
      <div className="mb-12 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#ff981f] text-3xl font-black text-white">
          G
        </div>
        <div>
          <p className="text-xl font-black">Grocerywatch</p>
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
              "group relative flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-left text-base font-extrabold transition",
              activeTab === tab ? "text-[#ff981f]" : "text-[#7f84b2] hover:text-white"
            )}
          >
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl", activeTab === tab ? "bg-[#ff981f]/15" : "bg-transparent")}>
              <Icon size={21} strokeWidth={2.35} />
            </span>
            {label}
            {activeTab === tab ? <span className="absolute -right-7 h-9 w-1.5 rounded-l-full bg-[#ff981f]" /> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-4 pt-10">
        <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Tracked basket</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {ITEMS.slice(0, 8).map((entry) => (
              <span key={entry.item} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm" title={entry.item}>
                {entry.item.slice(0, 1)}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-left font-extrabold text-[#7f84b2]">
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
        <article key={row.market} className="rounded-[24px] border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_50px_rgba(18,22,74,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#eaf7fb] text-3xl font-black text-[#2789a7]">
              {item.slice(0, 1)}
            </div>
            <span className="rounded-full bg-[#f5325c]/10 px-2.5 py-1 text-xs font-black text-[#f5325c]">
              {Math.abs(row.deltaPct).toFixed(0)}% {row.deltaPct >= 0 ? "above" : "below"}
            </span>
          </div>
          <p className="mt-4 text-2xl font-black text-[#f5325c]">{formatCurrency(row.price)}</p>
          <p className="mt-1 text-sm font-bold text-[#8b95ad]">{row.market} market</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm font-extrabold text-[#111322]">
              {item} price signal
            </p>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2789a7] text-white">
              <Package size={19} />
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9f3f7]">
            <div className="h-full rounded-full bg-[#2789a7]" style={{ width: `${Math.min(92, 42 + index * 13)}%` }} />
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
    <main className="min-h-screen bg-[#dff2f7] px-3 py-3 text-[#060815] sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[1540px] gap-6 rounded-[34px] bg-white/92 p-3 shadow-[0_28px_90px_rgba(39,137,167,0.18)] lg:p-6">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <section className="min-w-0 flex-1 px-1 py-2 sm:px-3 lg:px-5">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff981f]">Sri Lanka grocery price monitor</p>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.03em] text-[#060815] sm:text-5xl">
                Grocerywatch.lk
              </h1>
              <p className="mt-2 text-base font-bold text-[#7d8aaa]">Food price intelligence for Sri Lanka</p>
            </div>

            <div className="flex items-center gap-3">
              <button className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#060815] shadow-[0_12px_30px_rgba(18,22,74,0.08)]" type="button">
                <Search size={22} />
              </button>
              <button className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-[#060815] shadow-[0_12px_30px_rgba(18,22,74,0.08)]" type="button">
                <Bell size={21} />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#f5325c]" />
              </button>
              <div className="hidden items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-[0_12px_30px_rgba(18,22,74,0.08)] sm:flex">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf7fb] text-[#2789a7]">
                  <UserRound size={20} />
                </span>
                <span className="font-extrabold">Analyst</span>
                <ChevronDown size={17} className="text-[#7d8aaa]" />
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
                  "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black",
                  activeTab === tab ? "bg-[#101346] text-white" : "bg-white text-[#7d8aaa]"
                )}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          <section className="mb-5 rounded-[24px] border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-[#8b95ad]">
                  <Search size={14} />
                  Item
                </span>
                <select
                  value={item}
                  onChange={(event) => setItem(event.target.value as FoodItem)}
                  className="focus-ring h-12 rounded-xl border border-[#d9e3f2] bg-[#fbfdff] px-4 text-base font-black text-[#060815]"
                >
                  {ITEMS.map((entry) => (
                    <option key={entry.item} value={entry.item}>
                      {entry.item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-[#8b95ad]">
                  <MapPin size={14} />
                  Market
                </span>
                <select
                  value={market}
                  onChange={(event) => setMarket(event.target.value as MarketName)}
                  className="focus-ring h-12 rounded-xl border border-[#d9e3f2] bg-[#fbfdff] px-4 text-base font-black text-[#060815]"
                >
                  {MARKETS.map((entry) => (
                    <option key={entry.market} value={entry.market}>
                      {entry.market}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.16em] text-[#8b95ad]">
                  <LineChartIcon size={14} />
                  Date range
                </span>
                <select
                  value={rangeMonths}
                  onChange={(event) => setRangeMonths(Number(event.target.value))}
                  className="focus-ring h-12 rounded-xl border border-[#d9e3f2] bg-[#fbfdff] px-4 text-base font-black text-[#060815]"
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Last {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid min-w-36 content-end">
                <div className="rounded-2xl bg-[#2789a7] px-5 py-3 text-white">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Latest sample</p>
                  <p className="text-2xl font-black">{series.at(-1)?.monthLabel ?? "No data"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid overflow-hidden rounded-[24px] border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,22,74,0.05)] sm:grid-cols-2 xl:grid-cols-4">
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
              <section className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                <SectionHeader
                  title={`${item} analytics`}
                  note={`${market} price trend, rolling average, forecast, and unusual movements.`}
                  action={
                    <div className="flex items-center gap-4 text-xs font-black text-[#060815]">
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#12164a]" />Actual</span>
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#ff981f]" />Rolling</span>
                    </div>
                  }
                />
                <div className="h-[372px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 14, right: 16, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e8eff9" vertical={false} />
                      <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={70}
                        tickFormatter={compactLkrAxis}
                        domain={["dataMin - 30", "dataMax + 30"]}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Line type="monotone" dataKey="Actual" stroke="#12164a" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="3M average" stroke="#ff981f" strokeWidth={2.6} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="Forecast"
                        stroke="#2789a7"
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
                          fill="#f5325c"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <aside className="grid gap-6">
                <section className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
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
                  <p className="-mt-2 text-center text-3xl font-black text-[#404359]">{basketSnapshot ? formatCurrency(basketSnapshot.total) : "n/a"}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-black text-[#6f7d9f]">
                    {donutData.slice(0, 3).map((entry, index) => (
                      <span key={entry.name} className="flex items-center gap-2">
                        <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GROCERY_COLORS[index] }} />
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                  <SectionHeader title="Explanation" />
                  <p className="text-base font-semibold leading-8 text-[#53607d]">{readout}</p>
                </section>
              </aside>

              <section className="xl:col-span-2">
                <ProductStrip item={item} comparison={comparison} />
              </section>

              <section className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)] xl:col-span-2">
                <SectionHeader title="Recent alerts" note="Detected outliers across tracked markets." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {recentAnomalies.map((alert) => (
                    <div key={`${alert.market}-${alert.date}-${alert.score}`} className="rounded-2xl bg-[#fff6f7] p-4">
                      <AlertTriangle className="mb-3 text-[#f5325c]" size={21} />
                      <p className="font-black text-[#060815]">{alert.market}</p>
                      <p className="text-sm font-bold text-[#7d8aaa]">{alert.monthLabel}</p>
                      <p className="mt-2 text-sm font-extrabold text-[#f5325c]">{formatCurrency(alert.price)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "Markets" ? (
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                <SectionHeader title={`${item} by market`} note="Ranking against the current national median." />
                <div className="h-[430px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={comparison} margin={{ top: 16, right: 20, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e8eff9" vertical={false} />
                      <XAxis dataKey="market" tickLine={false} axisLine={false} interval={0} />
                      <YAxis yAxisId="price" tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                      <YAxis yAxisId="delta" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip content={<MarketTooltip />} />
                      <Bar yAxisId="price" dataKey="price" name="Latest price" radius={[10, 10, 0, 0]}>
                        {comparison.map((row) => (
                          <Cell key={row.market} fill={row.market === market ? "#ff981f" : "#2789a7"} />
                        ))}
                      </Bar>
                      <Line yAxisId="delta" type="monotone" dataKey="deltaPct" name="Median delta" stroke="#12164a" strokeWidth={3} dot={{ r: 4, fill: "#12164a" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                <div className="p-5">
                  <SectionHeader title="Market list" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead className="text-[#7d8aaa]">
                      <tr>
                        <th className="px-5 py-3 font-black">No</th>
                        <th className="px-5 py-3 font-black">Market</th>
                        <th className="px-5 py-3 font-black">Price</th>
                        <th className="px-5 py-3 font-black">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((row) => (
                        <tr key={row.market} className="border-t border-[#e8eff9]">
                          <td className="px-5 py-4 font-black">{row.rank}</td>
                          <td className="px-5 py-4">
                            <p className="font-black text-[#060815]">{row.market}</p>
                            <p className="text-xs font-bold text-[#8b95ad]">{row.province}</p>
                          </td>
                          <td className="px-5 py-4 font-black">{formatCurrency(row.price)}</td>
                          <td className="px-5 py-4">
                            <span className={cn("rounded-full px-3 py-1 text-xs font-black", row.deltaPct > 0 ? "bg-[#fff1f2] text-[#f5325c]" : "bg-[#edf9fc] text-[#2789a7]")}>
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
              <div className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                <SectionHeader title="Household basket" note="Monthly staple estimate by household size." />
                <label className="grid gap-4 rounded-[22px] bg-[#edf9fc] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-black text-[#060815]">
                      <Calculator size={18} />
                      Household size
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={householdSize}
                      onChange={(event) => setHouseholdSize(Number(event.target.value))}
                      className="focus-ring h-12 w-24 rounded-2xl border border-[#d9e3f2] bg-white px-3 text-center font-black"
                    />
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={householdSize}
                    onChange={(event) => setHouseholdSize(Number(event.target.value))}
                    className="accent-[#2789a7]"
                  />
                </label>
                <div className="mt-5 rounded-[24px] bg-[#101346] p-5 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">Latest basket</p>
                  <p className="mt-2 text-4xl font-black">{formatCurrency(basketSnapshot?.total ?? 0)}</p>
                  <p className="mt-2 text-sm font-bold text-white/65">
                    {basketSnapshot?.changePct === null || basketSnapshot?.changePct === undefined
                      ? "No previous month comparison"
                      : `${formatPct(basketSnapshot.changePct)} from previous month`}
                  </p>
                </div>
                <p className="mt-5 text-base font-semibold leading-8 text-[#53607d]">{basketSnapshot ? basketReadout(basketSnapshot) : "No basket data available."}</p>
              </div>

              <div className="grid gap-6">
                <section className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                  <SectionHeader title="Basket trend" />
                  <div className="h-[290px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={basketTrend} margin={{ top: 12, right: 16, bottom: 2, left: 0 }}>
                        <defs>
                          <linearGradient id="basketFillNew" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#2789a7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2789a7" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e8eff9" vertical={false} />
                        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={compactLkrAxis} />
                        <Tooltip content={<PriceTooltip />} />
                        <Area type="monotone" dataKey="Basket cost" stroke="#2789a7" strokeWidth={3} fill="url(#basketFillNew)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-[24px] border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                  <SectionHeader title="Top contributors" />
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topBasketContributors} layout="vertical" margin={{ top: 6, right: 28, bottom: 0, left: 10 }}>
                        <CartesianGrid stroke="#e8eff9" horizontal={false} />
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
              <div className="rounded-[24px] border border-[#dfe8f6] bg-white p-6 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
                <SectionHeader title="Methodology" />
                <div className="space-y-4 text-sm font-semibold leading-7 text-[#53607d]">
                  <p>
                    Grocerywatch.lk currently uses a deterministic local dataset covering 24 months, 10 food items, and 8 Sri Lankan markets. The data layer is isolated so open datasets can replace the seed records cleanly.
                  </p>
                  <p>
                    Calculations include month-on-month change, rolling average, volatility, robust anomaly detection, market median comparison, and a short-range forecast using trend plus exponential smoothing.
                  </p>
                  <p>This is a portfolio prototype, not an official statistical release or financial advice.</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#dfe8f6] bg-white p-6 shadow-[0_18px_50px_rgba(18,22,74,0.05)]">
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
                    <div key={path} className="rounded-2xl border border-[#dfe8f6] bg-[#fbfdff] p-4">
                      <p className="inline-flex items-center gap-2 font-black text-[#060815]">
                        <Database size={16} />
                        {title}
                      </p>
                      <p className="mt-2 break-words text-xs font-bold text-[#8b95ad]">{path}</p>
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
