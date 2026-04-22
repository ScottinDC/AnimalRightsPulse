# Animal Rights Pulse

Animal Rights Pulse is a static single-page dashboard for tracking rising animal-rights signals across Google Search Console, GA4 internal site search, Reddit via Apify, Google Trends via Apify, and Google News via Apify.

The frontend is a Vite + React + TypeScript app that reads only committed JSON files from [`/public/data`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/public/data). External APIs are called only by server-side Node scripts in [`/scripts`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts), typically through GitHub Actions.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- GitHub Actions
- Apify actors for Reddit, Google Trends, and Google News

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

Each script writes deterministic JSON into [`/public/data`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/public/data):

- [`scripts/fetch-gsc.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/fetch-gsc.mjs)
- [`scripts/fetch-ga4-site-search.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/fetch-ga4-site-search.mjs)
- [`scripts/fetch-reddit.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/fetch-reddit.mjs)
- [`scripts/fetch-google-trends.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/fetch-google-trends.mjs)
- [`scripts/fetch-google-news.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/fetch-google-news.mjs)
- [`scripts/normalize-data.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/normalize-data.mjs)
- [`scripts/build-summary.mjs`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/scripts/build-summary.mjs)

## Browse.ai hosted flow

Recommended production path:

`Browse.ai -> Make.com or Zapier -> GitHub repository_dispatch -> GitHub Action -> updated JSON -> GitHub Pages`

This avoids hosting a server on your computer.

### GitHub Action trigger

The trend refresh workflow now accepts:

- scheduled runs
- manual `workflow_dispatch`
- `repository_dispatch` with type `browse_ai_reddit`

The Action writes the incoming Browse.ai payload to [`public/data/browse-ai-reddit.json`](/Users/scottstadum/Desktop/Projects/Apps/AWE%20CHE%20/Animal%20Rights%20Pulse/public/data/browse-ai-reddit.json), rebuilds [`public/data/reddit.json`](/Users/scottstadum/Desktop/Projects/Apps/AWE%20CHE%20/Animal%20Rights%20Pulse/public/data/reddit.json), then regenerates [`public/data/signals.json`](/Users/scottstadum/Desktop/Projects/Apps/AWE%20CHE%20/Animal%20Rights%20Pulse/public/data/signals.json) and [`public/data/summary.json`](/Users/scottstadum/Desktop/Projects/Apps/AWE%20CHE%20/Animal%20Rights%20Pulse/public/data/summary.json).

### Make.com or Zapier request

Send a `POST` request to:

`https://api.github.com/repos/ScottinDC/AnimalRightsPulse/dispatches`

Headers:

- `Accept: application/vnd.github+json`
- `Authorization: Bearer YOUR_GITHUB_TOKEN`
- `X-GitHub-Api-Version: 2022-11-28`

Body:

```json
{
  "event_type": "browse_ai_reddit",
  "client_payload": {
    "browse_ai_payload": {
      "items": [
        {
          "title": "Seattle factory farming protest draws larger crowd after footage release",
          "url": "https://example.org/seattle-factory-farming-protest",
          "permalink": "/r/AnimalRights/comments/rr1",
          "subreddit": "AnimalRights",
          "rank": 1,
          "score": 328,
          "numComments": 74,
          "createdUtc": "2026-04-20T18:10:00.000Z"
        }
      ]
    }
  }
}
```

Expected row fields from Browse.ai:

- `title`
- `url`
- `permalink`
- `subreddit`
- `rank`
- `score`
- `numComments`
- `createdUtc`

### Manual fallback

You can also trigger the workflow manually in GitHub Actions and paste the payload into the `browse_ai_payload` input.

## GitHub Actions

[`/.github/workflows/update-trends.yml`](/Users/scottstadum/Desktop/Projects/Apps/Animal%20Rights%20Pulse/.github/workflows/update-trends.yml) runs on `workflow_dispatch` plus a recurring cron. It:

- installs dependencies
- fetches Search Console and GA4 data
- fetches Reddit, Google Trends, and Google News via Apify
- normalizes signals
- builds summary data
- commits changed JSON files back into the repo

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
- `APIFY_TOKEN`

## Notes by source

- Search Console returns top rows rather than every possible row, so trend detection is intentionally based on comparison windows.
- GA4 internal site search depends on correct site-search instrumentation for each property.
- Reddit is sourced through the Apify Reddit scraper rather than direct Reddit OAuth.
- Google Trends and Google News are sourced through Apify actors and normalized into stable local JSON so the frontend remains static.

## Deployment

The frontend is static and can be deployed to GitHub Pages after running `npm run build`. Because the app reads only committed JSON, there are no browser-side secrets.

## Next steps

1. Add credentials to GitHub secrets.
2. Verify both Search Console properties and confirm the OAuth refresh token can access them.
3. Verify GA4 internal search is instrumented correctly on both sites.
4. Enable GitHub Pages and point it at the built static output.
5. Test manual workflow runs from Actions before relying on the schedule.
6. Validate the output JSON shape from the Apify Reddit, Google Trends, and Google News actors and adjust the normalization layer if fields drift.
