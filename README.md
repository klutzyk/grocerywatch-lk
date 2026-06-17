# Grocerywatch.lk

Grocerywatch.lk is a portfolio-quality data science web app for exploring Sri Lankan food price movement. It opens directly into a working dashboard for commodity trends, market comparison, anomaly alerts, short-range forecasts, and a household staple basket estimate.

The product direction is a grocery intelligence dashboard: a dark navigation rail, clean analytics cards, rounded food-product surfaces, and a light teal/orange/red grocery palette.

## Why This Matters

Food price movement affects household budgets, small shops, students, researchers, NGOs, and policy teams. Grocerywatch.lk is designed to show not just what changed, but whether the movement looks unusual, where prices are high or low, and which basket items are driving monthly pressure.

## Current Data

The MVP uses a deterministic local seed dataset so the app works immediately without paid APIs or fragile downloads.

- 10 items: Rice, Dhal, Coconut, Eggs, Chicken, Fish, Flour, Sugar, Milk Powder, Onion
- 8 markets: Colombo, Kandy, Galle, Jaffna, Anuradhapura, Kurunegala, Batticaloa, Matara
- 24 monthly periods from July 2024 to June 2026
- Trend, seasonality, market-level differences, and plausible spike events are built into the generated data

Planned real data sources:

- WFP / HDX Sri Lanka food prices dataset
- Sri Lanka Department of Census and Statistics retail price and inflation releases
- Central Bank of Sri Lanka exchange rates
- World Bank Sri Lanka food price estimates where available

## Analytics Methods

Implemented in `src/lib/prices`:

- latest and previous monthly price
- month-on-month percentage change
- 3-month rolling average
- 6-month average
- volatility score from recent percentage changes
- anomaly detection using robust median absolute deviation
- short-range forecast using linear trend blended with exponential smoothing
- market ranking by latest price
- percentage above or below national median
- household food basket cost estimate
- deterministic plain-English explanation generated from computed metrics

## Architecture

```text
src/lib/prices/types.ts          Shared domain types
src/lib/prices/seed-data.ts      Deterministic MVP data source
src/lib/prices/analytics.ts      Metrics, anomaly detection, basket logic
src/lib/prices/forecast.ts       Forecast helpers
src/lib/prices/explanations.ts   Human-readable metric summaries
src/components/dashboard/*       Grocerywatch dashboard UI
src/app/page.tsx                 App Router entry point
```

The seed layer is isolated so it can be replaced by CSV ingestion, scheduled static generation, or an API-backed data source later.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Validation commands:

```bash
npm run lint
npm run build
```

## Future Improvements

- Add real CSV ingestion for WFP/HDX food price files
- Add source freshness metadata and download timestamps
- Add province-level map once reliable geospatial boundaries are included
- Add item category filters and exportable chart snapshots
- Add automated tests for analytics edge cases
- Add a small ingestion notebook or script for recruiter review

## CV / Portfolio Bullets

- Built a Next.js and TypeScript grocery price intelligence dashboard for Sri Lankan food trends.
- Implemented deterministic analytics for trend, volatility, anomaly detection, market ranking, and basket index calculations.
- Designed a clean data layer that can swap local seed data for open food price datasets.
- Created plain-English explanation cards from computed metrics without using paid AI APIs.
- Produced a responsive, dashboard-first UI with Recharts visualizations and Tailwind CSS.
