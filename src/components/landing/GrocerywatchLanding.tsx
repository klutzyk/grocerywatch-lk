"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { landingDistricts, type LandingDistrict } from "@/lib/landing-districts";

const metrics = [
  {
    label: "Monthly household basket",
    value: "Rs. 16,480",
    sub: "family of four, essentials",
    change: "+4.2%",
    note: "vs. last month",
    tone: "up"
  },
  {
    label: "Vegetable price index",
    value: "↑ 18.3%",
    sub: "month-on-month",
    change: "High volatility",
    note: "seasonal pressure",
    tone: "up"
  },
  {
    label: "Cheapest market",
    value: "Dambulla",
    sub: "Rs. 14,920 / month",
    change: "-9.5%",
    note: "vs. Colombo avg.",
    tone: "down"
  },
  {
    label: "Districts with spikes",
    value: "8 / 25",
    sub: "above 10% MoM",
    change: "+3 districts",
    note: "since last week",
    tone: "up"
  }
];

const storySteps = [
  {
    id: "overview",
    tag: "National overview",
    chapter: "01",
    headline: "Price pressure is building across most districts",
    body:
      "The household basket now costs Rs. 16,480 on average, up 4.2% from last month. Vegetable supply disruption and transport costs are pushing several districts above normal monthly movement.",
    stat: "Rs. 16,480",
    statLabel: "avg. household basket",
    mapLabel: "All districts · price pressure heatmap"
  },
  {
    id: "western",
    tag: "Western Province",
    chapter: "02",
    headline: "Colombo shows the sharpest urban basket pressure",
    body:
      "Colombo remains the highest-cost basket in the model. Gampaha and Kalutara are elevated too, while wholesale movement through Manning Market keeps some perishables more competitive.",
    stat: "+8.6%",
    statLabel: "Colombo basket · month-on-month",
    mapLabel: "Western Province · Colombo, Gampaha, Kalutara"
  },
  {
    id: "central",
    tag: "Central Province",
    chapter: "03",
    headline: "Upcountry markets are driving volatility",
    body:
      "Kandy and nearby highland markets show higher vegetable volatility, reflecting weather-sensitive supply routes and uneven availability of fresh produce.",
    stat: "+22%",
    statLabel: "leafy greens above national mean",
    mapLabel: "Central Province · Kandy, Matale, Nuwara Eliya"
  },
  {
    id: "cheapest",
    tag: "Best-value districts",
    chapter: "04",
    headline: "Southern and eastern districts keep baskets lower",
    body:
      "Hambantota, Ampara, Polonnaruwa, and Monaragala benefit from direct farm and coastal supply chains, keeping the essential basket below the national average.",
    stat: "Rs. 15,600",
    statLabel: "Hambantota basket · lowest in model",
    mapLabel: "Lowest-cost districts highlighted"
  }
];

const alertRows = [
  { item: "Red onions (kg)", market: "Dambulla", change: "+23.4%", tone: "up" },
  { item: "Tomatoes (kg)", market: "Manning Market", change: "+17.1%", tone: "up" },
  { item: "Green chillies (kg)", market: "Pettah", change: "+14.8%", tone: "up" },
  { item: "Coconut (each)", market: "Kurunegala", change: "+8.2%", tone: "up" },
  { item: "Dhal (kg)", market: "National avg.", change: "-2.1%", tone: "down" }
];

const trendData = [
  { month: "Feb", basket: 14980, veg: 3120 },
  { month: "Mar", basket: 15340, veg: 3280 },
  { month: "Apr", basket: 15720, veg: 3540 },
  { month: "May", basket: 15890, veg: 3410 },
  { month: "Jun", basket: 15820, veg: 3380 },
  { month: "Jul", basket: 16480, veg: 4010 }
];

const marketData = [
  { market: "Dambulla", cost: 14920 },
  { market: "Pettah", cost: 15100 },
  { market: "Kandy", cost: 15680 },
  { market: "Matara", cost: 15750 },
  { market: "Kurunegala", cost: 16200 },
  { market: "Gampaha", cost: 17050 },
  { market: "Colombo", cost: 18450 }
];

const basketData = [
  { name: "Rice & grains", value: 28, color: "#1b3b6f" },
  { name: "Vegetables", value: 24, color: "#c84b1a" },
  { name: "Protein", value: 18, color: "#5a8fbe" },
  { name: "Oil & spices", value: 14, color: "#d4845a" },
  { name: "Pulses & dhal", value: 10, color: "#2d6a4f" },
  { name: "Other staples", value: 6, color: "#b0aba0" }
];

const trackedItems = [
  { category: "Rice & grains", items: ["Samba rice", "Nadu rice", "Red raw rice", "Wheat flour", "String hoppers"] },
  { category: "Vegetables", items: ["Red onions", "Tomatoes", "Green beans", "Carrots", "Leeks"] },
  { category: "Protein", items: ["Fresh tuna", "Dried fish", "Eggs", "Chicken", "Dhal"] },
  { category: "Essentials", items: ["Coconut", "Coconut oil", "Chillies", "Garlic", "Salt"] }
];

function getPressureColor(district: LandingDistrict, highlight: string): string {
  const inGroup = (ids: string[]) => ids.includes(district.id);
  const dim = "#dedbd2";

  if (highlight === "overview") {
    if (district.changePercent >= 8) return "#9b2915";
    if (district.changePercent >= 6) return "#c84b1a";
    if (district.changePercent >= 4.5) return "#d97044";
    if (district.changePercent >= 3) return "#e8a882";
    if (district.changePercent >= 2) return "#b8d4be";
    return "#4d9966";
  }

  if (highlight === "western") {
    if (inGroup(["colombo", "gampaha", "kalutara"])) {
      if (district.id === "colombo") return "#9b2915";
      if (district.id === "gampaha") return "#c84b1a";
      return "#d97044";
    }
    return dim;
  }

  if (highlight === "central") {
    if (inGroup(["kandy", "nuwara_eliya", "matale"])) {
      if (district.id === "kandy") return "#9b2915";
      if (district.id === "nuwara_eliya") return "#d97044";
      return "#e8a882";
    }
    return dim;
  }

  if (highlight === "cheapest") {
    if (inGroup(["hambantota", "polonnaruwa", "ampara", "anuradhapura", "monaragala", "matara"])) {
      const scale = ["#1b3b6f", "#2a5298", "#3b6cb5", "#5080c0", "#6d96cf", "#8aadde"];
      const sorted = [...landingDistricts].sort((a, b) => a.basketCost - b.basketCost);
      return scale[Math.min(5, sorted.findIndex((entry) => entry.id === district.id))] ?? "#2a5298";
    }
    return dim;
  }

  return dim;
}

function LandingTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border border-[#302d27] bg-[#0e0d0c] px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-mono text-[#b0aba0]">{label}</div>
      {payload.map((point) => (
        <div key={point.name} className="font-mono text-white">
          {point.name}: Rs. {Number(point.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
}

function SriLankaDistrictMap({
  highlight,
  hoveredDistrict,
  onHover
}: {
  highlight: string;
  hoveredDistrict: string | null;
  onHover: (id: string | null) => void;
}) {
  const hovered = hoveredDistrict ? landingDistricts.find((district) => district.id === hoveredDistrict) : null;

  return (
    <div className="relative select-none">
      <svg viewBox="0 0 300 520" className="mx-auto block h-[430px] w-full max-w-[360px]" aria-label="Sri Lanka district price pressure map">
        {landingDistricts.map((district) => {
          const isHovered = hoveredDistrict === district.id;
          return (
            <path
              key={district.id}
              d={district.path}
              fill={getPressureColor(district, highlight)}
              stroke="#ffffff"
              strokeLinejoin="round"
              strokeWidth="0.85"
              className="transition-[fill,opacity,filter] duration-300"
              style={{
                cursor: "pointer",
                filter: isHovered ? "brightness(0.84)" : undefined,
                opacity: hoveredDistrict && !isHovered ? 0.72 : 1
              }}
              onMouseEnter={() => onHover(district.id)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </svg>

      {hovered ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 min-w-44 -translate-x-1/2 bg-[#0e0d0c] px-4 py-3 shadow-lg">
          <div className="mb-1 font-mono text-xs text-[#8a8680]">{hovered.name} district</div>
          <div className="font-serif text-lg font-light text-white">
            Rs. {hovered.basketCost.toLocaleString()}
            <span className="ml-1 font-mono text-xs text-[#8a8680]">/mo</span>
          </div>
          <div className="mt-0.5 font-mono text-xs" style={{ color: hovered.changePercent >= 5 ? "#e8714a" : "#74c69d" }}>
            +{hovered.changePercent}% MoM
          </div>
        </div>
      ) : null}

      {highlight === "overview" ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="whitespace-nowrap font-mono text-xs text-[#6b6862]">Lower</span>
          <div className="flex h-2 flex-1">
            {["#4d9966", "#b8d4be", "#e8a882", "#d97044", "#c84b1a", "#9b2915"].map((color) => (
              <span key={color} className="flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="whitespace-nowrap font-mono text-xs text-[#6b6862]">Higher</span>
        </div>
      ) : null}
    </div>
  );
}

function Hero() {
  return (
    <header className="relative overflow-hidden border-b border-[#ddd9d0]">
      <div className="border-b border-[#ddd9d0]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#6b6862]">GroceryWatch</span>
            <span className="font-mono text-xs text-[#ddd9d0]">·</span>
            <span className="font-mono text-xs text-[#1b3b6f]">.lk</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-xs text-[#6b6862] sm:inline">Updated daily · July 2025</span>
            <Link href="/dashboard" className="bg-[#1b3b6f] px-4 py-2 text-sm font-medium text-white">
              Dashboard →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#c84b1a]" />
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#c84b1a]">Live price intelligence</span>
            </div>
            <h1 className="mb-6 font-serif text-[clamp(3rem,6vw,5.4rem)] font-light leading-[0.95] tracking-[-0.045em] text-[#0e0d0c]">
              Tracking what Sri
              <br />
              Lankan families <em className="text-[#1b3b6f]">pay</em>
              <br />
              for groceries.
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-8 text-[#5f5a52]">
              Daily price tracking across districts and major markets. We monitor essential food baskets, flag price spikes,
              and explain what is driving cost pressure in plain language.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="bg-[#1b3b6f] px-7 py-3 text-base font-medium text-white">
                Explore the dashboard →
              </Link>
              <a href="#story" className="border border-[#ddd9d0] px-7 py-3 text-base font-medium text-[#0e0d0c]">
                See current situation ↓
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-[#ddd9d0] bg-white p-6">
              <div className="mb-4 flex items-center justify-between border-b border-[#f0ede6] pb-3 font-mono text-xs text-[#6b6862]">
                <span>MARKET ALERT</span>
                <span className="bg-[#fdf2ee] px-2 py-0.5 text-[#c84b1a]">HIGH PRESSURE</span>
              </div>
              <div className="space-y-2">
                {alertRows.map((row) => (
                  <div key={row.item} className="flex items-center justify-between border-b border-[#f8f6f1] py-2">
                    <div>
                      <div className="text-sm font-medium text-[#0e0d0c]">{row.item}</div>
                      <div className="font-mono text-xs text-[#6b6862]">{row.market}</div>
                    </div>
                    <span className="font-mono text-sm font-medium" style={{ color: row.tone === "up" ? "#c84b1a" : "#2d6a4f" }}>
                      {row.change}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 font-mono text-xs text-[#6b6862]">vs. 30-day moving average · updated 08:00 IST</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MetricsBar() {
  return (
    <section className="border-b border-[#ddd9d0] bg-white">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="border-[#ddd9d0] py-5 sm:px-4 lg:border-r" style={{ borderRightWidth: index === metrics.length - 1 ? 0 : undefined }}>
              <div className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-[#6b6862]">{metric.label}</div>
              <div className="mb-1 font-serif text-[1.65rem] font-light leading-none tracking-[-0.02em] text-[#0e0d0c]">{metric.value}</div>
              <div className="font-mono text-xs text-[#6b6862]">{metric.sub}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-xs font-medium" style={{ color: metric.tone === "up" ? "#c84b1a" : "#2d6a4f" }}>
                  {metric.change}
                </span>
                <span className="font-mono text-xs text-[#b0aba0]">{metric.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollStory() {
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((element, index) => {
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveStep(index);
          });
        },
        { rootMargin: "-30% 0px -35% 0px", threshold: 0 }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  const step = storySteps[activeStep];

  return (
    <section id="story" className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
      <div className="mb-8 border-b border-[#ddd9d0] pb-5">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6862]">Price situation · July 2025</span>
        <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-[#0e0d0c]">Where prices are moving, and why</h2>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)] lg:gap-16">
        <div>
          {storySteps.map((item, index) => {
            const isActive = activeStep === index;
            return (
              <div
                key={item.id}
                ref={(element) => {
                  stepRefs.current[index] = element;
                }}
                className="flex min-h-[48vh] flex-col justify-center border-b border-[#eae6df] py-10 last:border-b-0"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-mono text-xs" style={{ color: isActive ? "#fff" : "#b0aba0", backgroundColor: isActive ? "#1b3b6f" : "transparent", padding: isActive ? "2px 8px" : undefined }}>
                    {item.chapter}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: isActive ? "#c84b1a" : "#b0aba0" }}>
                    {item.tag}
                  </span>
                </div>
                <h3 className="mb-4 max-w-xl font-serif text-[clamp(1.35rem,2vw,1.75rem)] font-normal leading-tight text-[#0e0d0c]">{item.headline}</h3>
                <p className="mb-6 max-w-[42ch] text-[15px] leading-7 text-[#4a4642]">{item.body}</p>
                <div className="w-fit border border-[#ddd9d0] bg-[#f0ede6] px-5 py-3">
                  <div className="font-serif text-2xl font-light text-[#0e0d0c]">{item.stat}</div>
                  <div className="mt-1 font-mono text-xs text-[#6b6862]">{item.statLabel}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-16">
            <div className="border border-[#ddd9d0] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6862]">Sri Lanka · district map</span>
                <span className="bg-[#fdf2ee] px-2 py-0.5 font-mono text-xs text-[#c84b1a]">
                  {step.chapter} / {storySteps.length}
                </span>
              </div>
              <SriLankaDistrictMap highlight={step.id} hoveredDistrict={hoveredDistrict} onHover={setHoveredDistrict} />
              <div className="mt-4 border-t border-[#f0ede6] pt-3 font-mono text-xs text-[#8a8680]">{step.mapLabel}</div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 px-1">
              {storySteps.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.tag}
                  onClick={() => stepRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="h-[3px] border-0 transition-all"
                  style={{ flex: activeStep === index ? 3 : 1, backgroundColor: activeStep === index ? "#1b3b6f" : "#ddd9d0" }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="border border-[#ddd9d0] bg-white p-4">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-[#6b6862]">{step.mapLabel}</div>
            <SriLankaDistrictMap highlight={step.id} hoveredDistrict={hoveredDistrict} onHover={setHoveredDistrict} />
          </div>
        </div>
      </div>
    </section>
  );
}

function DataCharts() {
  return (
    <section className="border-y border-[#ddd9d0] bg-white py-14">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10 border-b border-[#f0ede6] pb-4">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6862]">Supporting data</span>
          <h2 className="mt-2 font-serif text-3xl font-light tracking-[-0.025em] text-[#0e0d0c]">Price trends, markets & basket structure</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="h-full border border-[#ddd9d0] p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-[#6b6862]">Household basket · 6-month trend</div>
                  <div className="font-serif text-2xl font-light text-[#0e0d0c]">+10.0% since February</div>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs text-[#6b6862]">
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 bg-[#1b3b6f]" />Total basket</span>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 bg-[#c84b1a]" />Vegetables</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#f0ede6" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#6b6862" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#6b6862" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} />
                  <Tooltip content={<LandingTooltip />} />
                  <Line type="monotone" dataKey="basket" name="Total basket" stroke="#1b3b6f" strokeWidth={2} dot={{ fill: "#1b3b6f", r: 3 }} />
                  <Line type="monotone" dataKey="veg" name="Vegetables" stroke="#c84b1a" strokeWidth={1.5} strokeDasharray="4 3" dot={{ fill: "#c84b1a", r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 font-mono text-xs text-[#b0aba0]">Rs. per household · all markets weighted average</div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-full border border-[#ddd9d0] p-6">
              <div className="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-[#6b6862]">Essential basket composition</div>
              <div className="mb-4 font-serif text-2xl font-light text-[#0e0d0c]">Share of spend</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={basketData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                    {basketData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {basketData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-xs text-[#6b6862]"><span className="h-2 w-2" style={{ backgroundColor: item.color }} />{item.name}</span>
                    <span className="font-mono text-xs font-medium text-[#0e0d0c]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-12">
            <div className="border border-[#ddd9d0] p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-[#6b6862]">Market comparison · monthly basket cost</div>
                  <div className="font-serif text-2xl font-light text-[#0e0d0c]">Rs. 3,530 spread between cheapest and most expensive</div>
                </div>
                <div className="font-mono text-xs text-[#6b6862]">Same basket, 7 major markets</div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={marketData} layout="vertical" margin={{ top: 0, right: 60, left: 64, bottom: 0 }}>
                  <CartesianGrid stroke="#f0ede6" strokeDasharray="2 4" horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "#6b6862" }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs.${(Number(value) / 1000).toFixed(0)}k`} domain={[14000, 19000]} />
                  <YAxis type="category" dataKey="market" tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#6b6862" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<LandingTooltip />} cursor={{ fill: "#f0ede6" }} />
                  <Bar dataKey="cost" name="Basket cost" radius={0} barSize={14}>
                    {marketData.map((entry) => <Cell key={entry.market} fill={entry.cost < 15200 ? "#2d6a4f" : entry.cost > 17500 ? "#c84b1a" : "#1b3b6f"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 font-mono text-xs text-[#b0aba0]">Basket: 32 essential items · prices collected July 10-12, 2025</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#f8f6f1]">
      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6b6862]">What we track</span>
            <h2 className="mb-4 mt-3 font-serif text-3xl font-light leading-tight tracking-[-0.025em] text-[#0e0d0c]">
              32 essential items,
              <br />
              25 districts,
              <br />
              every day.
            </h2>
            <p className="mb-6 text-sm leading-7 text-[#6b6862]">
              GroceryWatch.lk compares retail prices from markets, supermarkets, and cooperative shops across Sri Lanka,
              helping households, journalists, and policymakers understand cost-of-living movement.
            </p>
          </div>
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 border border-[#ddd9d0] md:grid-cols-4">
              {trackedItems.map((category, index) => (
                <div key={category.category} className="border-[#ddd9d0] p-5 md:border-r" style={{ borderRightWidth: index === trackedItems.length - 1 ? 0 : undefined }}>
                  <div className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-[#1b3b6f]">{category.category}</div>
                  <ul className="space-y-1.5">
                    {category.items.map((item) => <li key={item} className="text-xs text-[#6b6862]">{item}</li>)}
                    <li className="text-xs text-[#b0aba0]">+ more →</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#1b3b6f] py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-7">
            <div className="mb-4 font-mono text-xs text-white/50">GroceryWatch.lk · Public price intelligence</div>
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-light leading-tight tracking-[-0.035em] text-white">
              See the full picture.
              <br />
              <em className="text-white/65">Track any market, any item.</em>
            </h2>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <Link href="/dashboard" className="bg-white px-8 py-4 text-center font-medium text-[#1b3b6f]">
              Open dashboard →
            </Link>
            <p className="text-center font-mono text-xs text-white/45">Free to use · No account required</p>
          </div>
        </div>
      </section>
    </footer>
  );
}

export function GrocerywatchLanding() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] font-sans text-[#0e0d0c]">
      <Hero />
      <MetricsBar />
      <ScrollStory />
      <DataCharts />
      <Footer />
    </main>
  );
}
