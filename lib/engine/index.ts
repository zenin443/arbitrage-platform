/**
 * @server-only
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SECURITY: PROPRIETARY ALGORITHM MODULE — SERVER-SIDE ONLY         │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  This module contains Arbitrance's core IP: gap detection,         │
 * │  spread calculation, fee modeling, and opportunity scoring logic.   │
 * │                                                                    │
 * │  NEVER import this module (or any file under lib/engine/) from:    │
 * │    - Client Components ('use client')                              │
 * │    - Files in app/ that are not Server Components                  │
 * │    - Files in components/ that run in the browser                  │
 * │    - Any code that webpack could bundle into client-side JS        │
 * │                                                                    │
 * │  If this code reaches a client bundle, it is publicly readable     │
 * │  in browser DevTools — equivalent to open-sourcing the algorithm.  │
 * │                                                                    │
 * │  To consume engine data on the client, use the API routes:         │
 * │    GET /api/opportunities                                          │
 * │    GET /api/prices                                                 │
 * │    WebSocket feed at ws://host:3002                                │
 * │                                                                    │
 * │  Enforced by:                                                      │
 * │    1. `import "server-only"` (build-time poison pill)              │
 * │    2. ESLint no-restricted-imports rule                            │
 * │    3. Code review policy (P2-001)                                  │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import "server-only";

export { PriceEngine, priceEngine } from "./priceEngine";
export { calculateSpread, MIN_NET_SPREAD_PCT } from "./spreadCalculator";
export { scoreOpportunity, rankOpportunities } from "./opportunityScorer";
export type { ScoringInput } from "./opportunityScorer";
