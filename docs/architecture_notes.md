# Menged Transit Engine — Data Access Architecture Notes

## 1. Executive Summary & Problem Rationale

Prior forensic profiling revealed that routing latency in Menged was **not** caused by PostgreSQL execution slowness.
* **Direct Bole → Piassa**: $\approx 62$ SQL queries per request ($\approx 4.18\text{s}$ total latency). Database execution/planning time was only $\approx 14.65\text{ms}$.
* **1-Transfer Bole → Ayat Chefe**: $\approx 162$ SQL queries per request ($\approx 4.24\text{s}$ total latency). Database execution/planning time was only $\approx 37.76\text{ms}$.

Over **99% of total request latency ($\approx 4.14\text{s}$)** was consumed by sequential HTTP/TCP application $\rightarrow$ database network round trips caused by executing SQL lookups inside nested candidate routing loops.

---

## 2. Architecture Comparison

### Previous Architecture (Sequential Round Trips)
```
HTTP Request
     │
     ├── findStopsNear(origin) [SQL]
     ├── findStopsNear(destination) [SQL]
     │
     └── Candidate Loop (up to 25 pairs)
           │
           ├── Loop 1: getRoutesForStop [SQL]
           ├── Loop 1: getTripsForRoute [SQL]
           ├── Loop 1: getOrderedStopsForTrip [SQL]
           │     ... (Repeated 62 to 162 times) ...
           └── Loop N: getOrderedStopsForTrip [SQL]
```
* **Failure Mode**: Query amplification ($O(N \times M)$ SQL queries). Round-trip latency multiplied linearly with the number of candidate stop pairs.

---

### New Architecture (Bulk Read + In-Memory Routing)
```
HTTP Request
     │
     ├── 1. Spatial Discovery (findStopsNear) [2 SQL queries]
     │
     ├── 2. RoutingDatasetLoader.getGlobalGraph() [0 SQL queries if warm, 4 bulk queries if cold]
     │
     └── 3. PURE IN-MEMORY ROUTING (RouterService) [0 SQL queries]
           │
           ├── Direct Candidate Evaluation (RoutingGraph.getStopTimesForStop)
           ├── Transfer Candidate Evaluation (RoutingGraph.getOrderedStopsForTrip)
           └── Sequence & Monotonicity Invariants Verification
```
* **Success Metric**: Query count is **100% constant ($2$ SQL queries total per request)** regardless of candidate pair counts ($4$ pairs vs. $400$ pairs execute the exact same $2$ SQL queries).
* **Latency**: Transfer routing latency dropped from $>10,000\text{ms}$ (timeout) down to **$\approx 284\text{ms}$**.

---

## 3. Component Hierarchy & Responsibilities

1. **`TransitRepository` (`src/db/repositories/transitRepository.ts`)**
   - Low-level set-based PostgreSQL queries (`fetchAllStops`, `fetchAllRoutes`, `fetchAllTrips`, `fetchAllStopTimes`).
2. **`RoutingGraph` (`src/services/routingGraph.ts`)**
   - Immutable, thread-safe in-memory graph containing indexed lookup maps (`stopsById`, `stopTimesByStopId`, `orderedStopsByTripId`, `tripsById`, `routesById`).
   - Supports $O(1)$ in-memory lookups with zero side effects.
3. **`RoutingDatasetLoader` (`src/services/routingDatasetLoader.ts`)**
   - Manages application-level static graph caching (`initGlobalGraph`, `reloadGlobalGraph`, `clearGlobalGraph`).
   - Performs thread-safe atomic reference swapping during cache reloads.
4. **`RouterService` (`src/services/router.ts`)**
   - Deterministic in-memory routing engine. Executes zero SQL queries during candidate evaluation loops.
5. **`SqlTracker` (`src/db/sqlTracker.ts`)**
   - Drizzle ORM logger hook with `AsyncLocalStorage` request isolation for exact SQL statement telemetry.

---

## 4. RoutingGraph Memory Footprint

* **Dataset Scale**: 2,312 stops, 464 routes, 921 trips, 9,389 stop_times, 255,191 shape points.
* **Heap Memory Footprint**:
  - Heap before graph construction: `3.3 MB`
  - Heap after graph construction: `7.8 MB`
  - **Measured Graph Cost**: `4.5 MB`

---

## 5. Cache Lifecycle & Concurrency Safety

* **Read Safety**: `RoutingGraph` maps are read-only. Concurrent HTTP requests safely share the single global graph reference without lock contention or mutation risks.
* **Reload Strategy**: `RoutingDatasetLoader.reloadGlobalGraph()` builds a complete new `RoutingGraph` instance in memory before atomically replacing `this.globalGraph = newGraph`. Active requests retain their reference to the graph instance they started with.
