# Conversational Analytics Assistant  
Comprehensive Implementation Guide

_Last updated: 27 Jun 2025_

---

## 1. Purpose  

Dealership staff can now ask plain-English analytics questions in Rylie's chat and receive:

* A conversational answer
* Auto-generated charts/metric cards
* Actionable recommendations
* 1-click follow-up questions

The assistant pulls live GA-4 & Google Search Console data, transforming it into insights without the user ever leaving chat.

---

## 2. High-Level Architecture  

```
┌──────── Chat UI ───────┐
│ ChatInterfaceWith…tsx │
│  • Captures message   │
│  • Renders bubbles    │
└──────────┬────────────┘
           │ REST /api/chat
           ▼
┌──────────────────────────────┐
│ /api/chat/route.ts           │
│ 1. parseAnalyticsQuery()     │
│ 2. if valid → analyticsAssistant.processQuery()│
│ 3. else → fallback LLM flow  │
└──────────┬───────────────────┘
           ▼
┌──────────────────────────┐
│ lib/analytics/assistant  │
│ • orchestrates flow      │
│ • fetch data, build prompt, call LLM |
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ lib/analytics/fetcher    │
│ • GA4 & GSC API wrappers │
│ • in-memory cache        │
│ • visualization builder  │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ lib/analytics/parser     │
│ • NLP → AnalyticsQuery   │
└──────────────────────────┘
```

UI visualisations are rendered by:

* `components/analytics/ChartVisualization.tsx`
* `components/analytics/AnalyticsBubble.tsx`

---

## 3. Code Map  

| Layer | Path | Key Responsibilities |
|-------|------|----------------------|
| Types | `lib/analytics/types.ts` | All shared TS interfaces |
| NLP Parser | `lib/analytics/parser.ts` | Regex + heuristic parsing into `AnalyticsQuery` |
| Data Fetching | `lib/analytics/fetcher.ts` | GA-4 & GSC calls, caching, visualisation generation |
| Orchestrator | `lib/analytics/assistant.ts` | Combines parser, fetcher, LLM prompt |
| API Hook | `app/api/chat/route.ts` | Detect analytics queries and short-circuit |
| React UI | `components/analytics/*` | Charts, metric cards, follow-up buttons |
| Tests | `lib/analytics/__tests__/parser.test.ts` | Parser unit coverage |

---

## 4. Data Flow  

1. **User message** → `/api/chat`  
2. `parseAnalyticsQuery` attempts to classify intent, metrics, dimensions, date range, filters.  
3. If `isValidQuery` returns _true_:  
   a. `AnalyticsDataFetcher.fetchData` executes GA-4 / GSC reports and caches.  
   b. Visualisations & insights calculated.  
   c. `AnalyticsAssistant.generateResponse` feeds data + dealership context into GPT-4o via OpenRouter.  
4. JSON payload returned: `{ content, visualizations[], followUp[] }`.  
5. Front-end detects `analytics: true` and renders an `AnalyticsBubble` with charts.

---

## 5. Setup Instructions  

### 5.1 Dependencies  
```bash
pnpm add react-chartjs-2 chart.js
```

### 5.2 Environment Variables  
| Var | Description |
|-----|-------------|
| `GA4_CLIENT_ID` / `GA4_CLIENT_SECRET` | OAuth credentials |
| `SEARCH_CONSOLE_CLIENT_ID` / `SEARCH_CONSOLE_CLIENT_SECRET` | OAuth credentials |
| `OPENROUTER_API_KEY` | GPT-4o access |
| `NEXTAUTH_URL` | Needed for OpenRouter referer header |

### 5.3 GA-4 / GSC On-Boarding  

1. Connect GA-4 and Search Console in **Settings → Integrations**.  
2. Ensure a property is selected; token is stored in the Agency record.  
3. The assistant will auto-fail gracefully if tokens are missing.

---

## 6. Usage Examples  

| User Question | System Behaviour |
|---------------|------------------|
| “How did our organic traffic from Google change this month?” | Parser intent=comparison, metrics=sessions, filters=source=google/organic → line chart + bar comparison, plain-English recap |
| “What are our top 5 landing pages last week?” | intent=content, limit=5 → bar chart of pages with pageviews |
| “Where are our visitors coming from?” | intent=local → pie chart of city/country distribution |

Follow-up buttons propose deeper questions (ranking trends, source breakdown, etc.).

---

## 7. Extending the Assistant  

1. **New Metrics/Dimensions**  
   * Add regex patterns in `METRIC_PATTERNS` / `DIMENSION_PATTERNS`.  
2. **Additional Data Sources**  
   * Implement a fetcher method, update `queryNeedsX` helper, merge in `combineData`.  
3. **Custom Visualisations**  
   * Add new `VisualizationType` and corresponding renderer in `ChartVisualization.tsx`.

---

## 8. Testing  

Run unit tests for the parser:

```bash
pnpm jest lib/analytics/__tests__/parser.test.ts
```

End-to-end test idea:

1. Seed dummy GA-4/GSC tokens in `.env.test`.  
2. Call `/api/chat` with analytics question.  
3. Assert JSON response contains `analytics:true` and at least one visualisation.

---

## 9. Known Limitations & Future Work  

* Parser relies on regex heuristics; ambiguous queries may fall back to generic LLM mode.  
* Only basic in-memory cache – consider Redis for scale.  
* Competitive benchmarking phase (Phase 3 spec) not yet implemented.  
* Voice interface & proactive alerts slated for Q3 2025.

---

## 10. Changelog  

| Date | Change | Author |
|------|--------|--------|
| 2025-06-27 | Initial implementation & docs | Factory assistant |

---
