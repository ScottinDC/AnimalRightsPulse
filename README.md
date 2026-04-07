# Animal Rights Signal Monitor

Animal Rights Signal Monitor is a static single-page dashboard for tracking rising animal-rights signals across Google Search Console, GA4 internal site search, Reddit, Google Trends via HasData, TrendHunter via Apify, and Google News trend data via RapidAPI.

The frontend is a Vite + React + TypeScript app that reads only committed JSON files from [`/public/data`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/public/data). External APIs are called only by server-side Node scripts in [`/scripts`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts), typically through GitHub Actions.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- GitHub Actions

## Project structure

```text
animal-rights-signal-monitor/
  public/data/
  src/components/
  src/lib/
  src/pages/
  scripts/
  .github/workflows/
```

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Build for production:

   ```bash
   npm run build
   ```

4. Run the mock-friendly pipeline locally:

   ```bash
   npm run pipeline
   ```

## Data pipeline

Each script writes deterministic JSON into [`/public/data`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/public/data):

- [`scripts/fetch-gsc.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/fetch-gsc.mjs)
- [`scripts/fetch-ga4-site-search.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/fetch-ga4-site-search.mjs)
- [`scripts/fetch-reddit.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/fetch-reddit.mjs)
- [`scripts/fetch-hasdata-trends.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/fetch-hasdata-trends.mjs)
- [`scripts/fetch-trendhunter.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/fetch-trendhunter.mjs)
- [`scripts/fetch-google-news-trends.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/fetch-google-news-trends.mjs)
- [`scripts/normalize-data.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/normalize-data.mjs)
- [`scripts/build-summary.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/scripts/build-summary.mjs)

## GitHub Actions

[`/.github/workflows/update-trends.yml`](/Users/scottstadum/Desktop/Projects/Apps/Animal Rights Pulse/.github/workflows/update-trends.yml) runs on `workflow_dispatch` plus a 3-hour cron. It:

- installs dependencies
- fetches each external source
- normalizes signals
- builds summary data
- commits changed JSON files back into the repo

If you want different cadences per source later, split the workflow into source-specific jobs or separate workflows. This v1 keeps scheduling simple in one file.

## Required secrets

Store these in GitHub repository or environment secrets:

- `GSC_CLIENT_ID`
- `GSC_CLIENT_SECRET`
- `GSC_REFRESH_TOKEN`
- `GSC_SITE_A`
- `GSC_SITE_B`
- `GA4_PROPERTY_ID_SITE_A`
- `GA4_PROPERTY_ID_SITE_B`
- `GA4_CLIENT_EMAIL`
- `GA4_PRIVATE_KEY`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`
- `HASDATA_API_KEY`
- `APIFY_TOKEN`
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST`

## Notes by source

- Search Console data returns top rows rather than every possible row, so trend detection is intentionally based on top-row comparison windows.
- GA4 internal site search depends on correct site-search instrumentation for each property. Without that, the pipeline will keep falling back to mock JSON.
- HasData runs asynchronously, so the implementation uses polling with retry/backoff.
- TrendHunter is isolated behind a fetch/normalize layer so changes in the actor payload do not break the frontend shape.
- Google News trend lines are normalized into a common series structure for charts.

## Deployment

The frontend is static and can be deployed to GitHub Pages after running `npm run build`. Because the app reads only committed JSON, there are no browser-side secrets.

## Next steps

1. Add credentials to GitHub secrets.
2. Verify both Search Console properties and confirm the OAuth refresh token can access them.
3. Verify GA4 internal search is instrumented correctly on both sites.
4. Enable GitHub Pages and point it at the built static output.
5. Test manual workflow runs from Actions before relying on the schedule.
6. Validate the output JSON shape from Apify and RapidAPI against live responses and adjust the normalization layer if those providers change fields.
