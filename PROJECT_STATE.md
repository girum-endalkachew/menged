# Project State: Menged Transit & Navigation Engine

## Phase 2: Deterministic Journey Ranking

### 1. Architecture & Components
- **`RouterService` (`src/services/router.ts`)**: Authoritative GTFS candidate journey discovery engine. Responsible for establishing journey validity: boarding/alighting sequence, spatial matching within radius buffer ($\ge 500\text{m}$), transfer connection validity, geometry hydration from GTFS `shapes.txt`.
- **`JourneyMetricsService` (`src/services/journeyMetrics.ts`)**: Deterministic geographic metrics calculation layer. Computes walking distances, transfer counts, journey geometry path distance, equirectangular directness, accumulated backtracking, and initial direction alignment.
- **`JourneyRankingService` (`src/services/journeyRanking.ts`)**: Deterministic candidate ordering layer. Receives already-valid candidate journeys and produces ordered results tailored to explicit user preferences:
  - `fastest`: Prioritizes `estimatedDurationMinutes` with deterministic tie-breakers.
  - `least_walking`: Prioritizes `totalWalkingMeters` with deterministic tie-breakers.
  - `fewest_transfers`: Prioritizes `transfersCount` with deterministic tie-breakers.
  - `balanced`: Pragmatic composite utility balancing travel duration ($1.0\times$), walking discomfort ($0.05\times$ per meter), transfer friction ($12.0\times$), and excess backtracking sanity ($0.02\times$ per meter beyond $150\text{m}$ tolerance).
  - `cheapest`: Honest handling of unavailable fare data (`fare = UNAVAILABLE`). Retains balanced ordering without fabricated costs or false "Cheapest" claims.
- **`useMengedStore` (`src/store/useMengedStore.ts`)**: Client state store. Synchronizes raw journeys and route presentation models using `JourneyRankingService`.

---

### 2. Design Decisions (FATRD Framework)
- **Fact**: The GTFS static dataset in Addis Ababa contains no fare tables (`fare = UNAVAILABLE`).
- **Assumption**: Users value travel time, physical walking effort, vehicle transfer discomfort, and route straightness differently depending on trip context.
- **Tradeoff**: Rejecting a single monolithic magic formula in favor of explicit deterministic sorting dimensions makes route rankings explainable and verifiable.
- **Risk**: Over-penalizing non-zero backtracking could unfairly reject or demote legitimate urban street network turns and roundabouts.
- **Decision**: Established a $150\text{m}$ backtracking tolerance baseline. Backtracking $\le 150\text{m}$ incurs zero penalty. Excess backtracking $> 150\text{m}$ incurs a calibrated $0.02\text{ pts/meter}$ sanity penalty. Deterministic tie-breaking concludes with stable journey IDs (`a.id.localeCompare(b.id)`).

---

### 3. Test Registry
- `src/services/__tests__/journeyRanking.test.ts`:
  - `CASE A — FASTEST`: Verified duration priority (30m/800m walk before 40m/200m walk). (PASS)
  - `CASE B — LEAST WALKING`: Verified walking priority (40m/200m walk before 30m/800m walk). (PASS)
  - `CASE C — FEWEST TRANSFERS`: Verified transfer priority (0-transfer 45m before 1-transfer 35m). (PASS)
  - `CASE D — BACKTRACKING SANITY`: Verified tolerance of $\le 150\text{m}$ detours while strongly penalizing $1200\text{m}$ overshoots. (PASS)
  - `CASE E — SAME METRICS`: Verified permutation-invariant deterministic tie-breaking. (PASS)
  - `CASE F — UNAVAILABLE FARE`: Verified refusal to fabricate fares and explicit `fareUnavailable: true`. (PASS)
  - `CASE G — REAL BOLE -> PIASSA`: Verified 40-journey evaluation across all preferences, preserving 100% of candidate IDs. (PASS)
- `src/services/__tests__/jev.test.ts`:
  - `Client Configuration`: OpenRouter gateway, TypeSafe native, and missing key handling. (PASS)
  - `Candidate Serialization`: Truthful UNAVAILABLE tagging for fare and realtime tracking. (PASS)
  - `CASE A — FASTEST`: JEV primary duration selection and candidate set preservation. (PASS)
  - `CASE B — LEAST WALKING`: JEV walking minimization selection. (PASS)
  - `CASE C — FEWEST TRANSFERS`: JEV direct route transfer selection. (PASS)
  - `CASE D — BALANCED`: Multi-attribute trade-off evaluation. (PASS)
  - `CASE E — BACKTRACKING`: Sanity tolerance without candidate discarding. (PASS)
  - `CASE F — CHEAPEST UNAVAILABLE`: Bypasses model invocation, uses balanced fallback. (PASS)
  - `CASE G — UNKNOWN ID REJECTION`: Handles hallucinated journey IDs safely. (PASS)
  - `CASE H — MALFORMED OUTPUT`: Graceful fallback on unexpected responses. (PASS)
  - `CASE I — TIMEOUT & API ERROR`: Graceful fallback on 500 error / network disconnect. (PASS)
  - `Explanation Grounding`: Sanitization of fake fares and fake live arrivals. (PASS)
  - `CASE J — REAL BOLE -> PIASSA (40 Candidates)`: Verified 100% candidate set preservation. (PASS)
  - `CASE K — SECOND REAL OD (MEXICO -> PIASSA: 145 Candidates)`: Verified candidate preservation and scaling. (PASS)
- `src/services/__tests__/journeyCompanionPhase5.test.ts`:
  - `Start Journey Contract`: Rejection of unselected navigation, explicit start context establishment. (PASS)
  - `Planning/Navigation Boundary`: `selectedRoute` preview does not mutate active navigation on Journey A. (PASS)
  - `Real Bole -> Piassa GTFS Trace`: Full progression from Walk -> Board -> Transit -> Alight -> Arrive. (PASS)
  - `Adversarial Overshoot`: Vector projection and passed stop detection prior to approach threshold. (PASS)
  - `GPS Jitter Hysteresis`: 50m exit threshold prevents platform oscillation. (PASS)
  - `Multi-Leg Transfer`: Monotonic leg advance and boarding confirmation reset. (PASS)
  - `Stale GPS Protection`: Out-of-order response rejection via sequence counter. (PASS)
  - `Journey Immutability`: 100% byte-for-byte invariant preservation across navigation. (PASS)
  - `API Validation`: Strict schema, journeyId match, and leg bounds on `POST /api/journey/state`. (PASS)
  - `Performance Benchmark`: 100 GPS evaluations in < 1ms (sub-0.01ms/update). (PASS)
- Total test suite: 154 pass, 0 fail across 20 test suites (both parallel and sequential `--parallel=1`).

---

### 4. What Has Been Built vs What Is Next
- **Phase 0**: Architecture baseline & GTFS schema. (Complete)
- **Phase 1**: In-memory routing graph, single-flight DB loader, multi-leg FSM companion. (Complete)
- **Phase 1.5**: Deterministic `JourneyMetrics` evaluation & benchmarking. (Complete)
- **Phase 2**: Deterministic journey ranking service, preference model integration, UI alignment. (Complete)
- **Phase 3**: Adversarial ranking QA over synthetic edge cases and real Addis corridors. (Complete)
- **Phase 4**: JEV (System 1 model) integration via `@typesafe-ai/sdk`, supporting OpenRouter and TypeSafe gateways with 100% deterministic fallback safety. (Complete)
- **Phase 5**: Real GPS-driven Journey Companion integration, FSM/GPS adversarial QA, overshoot precedence fix, hysteresis stabilization, and API contract hardening. (Complete)
- **Next Phases**: Live vehicle tracking (when GTFS-RT becomes available), fare estimation models (when tariff schedules are published).

---

### 5. Chronological Changelog
- **2026-09-28**: Implemented `JourneyRankingService` with 5 deterministic ranking preferences (`fastest`, `least_walking`, `fewest_transfers`, `balanced`, `cheapest`).
- **2026-09-28**: Created `journeyRanking.test.ts` covering synthetic test matrix and 40 real Bole $\to$ Piassa candidate journeys.
- **2026-09-28**: Updated `useMengedStore.ts` and `page.tsx` with explicit preference controls and honest fare transparency (`Cheapest (N/A)`).
- **2026-09-28**: Completed Phase 3 Adversarial Ranking QA with `journeyRankingAdversarial.test.ts` (10 test cases, 145 Mexico $\to$ Piassa scaling).
- **2026-09-28**: Installed `@typesafe-ai/sdk@0.6.0`, implemented `JEVService` with OpenRouter & TypeSafe gateway support, created `src/types/jev.ts`, and verified 16 adversarial/real-world tests in `jev.test.ts`.
- **2026-09-28**: Completed Phase 5 Journey Companion integration: fixed overshoot detection precedence (P1), implemented 50m platform hysteresis (P2), hardened `POST /api/journey/state` contract (P2), protected navigation boundary during route preview, and verified 11 adversarial tests in `journeyCompanionPhase5.test.ts`.
