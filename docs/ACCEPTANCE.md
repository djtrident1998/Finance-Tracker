# Acceptance evidence and limits

41 automated tests pass under Node 24: `node --test tests/*.test.mjs`. The three test files use synthetic fixtures and an isolated in-memory SQLite database. This is evidence for the tested capabilities, not a claim of full product acceptance. Browser checks are recorded separately below.

| ID | Evidence / remaining limitation |
|---|---|
| A01 | Exact decimal purchase/valuation golden case passes |
| A02 | Same-file, source overlap, explicit identical-event approval, repeated confirmation pass; institutional concurrent import stress remains untested |
| A03 | External-contribution-separated profit golden case passes |
| A04 | Unknown opening basis and missing-price/XIRR suppression pass |
| A05 | Dated 10% XIRR golden case passes; transfers excluded in implementation, provenance-preserving cross-account transfer test still needed |
| A06 | Zero-return and beginning/end payment boundary tests pass |
| A07 | Future target and zero-return required SIP golden case pass |
| A08 | 24-month 10% step-up contribution total ₹25,200 passes |
| A09 | Domain/API assignment fraction cap passes; UI to assign live holdings remains missing |
| A10 | Plan/option identity separation passes; research share-class de-duplication tested in scoring primitive |
| A11 | Score eligibility and insufficient cohort gates pass; total-return research pipeline not connected |
| A12 | Passive no-active-score gate passes; passive metric pipeline not connected |
| A13 | Comparison UI shows alternatives and unavailable costs/taxes; no numerical switch benefit is claimed, scenario-linked sale analysis missing |
| A14 | Performance-only consecutive-quarter input trigger tested; full saved quarter-snapshot pipeline missing |
| A15 | Split and dividend accounting pass; unsupported actions surfaced/rejected; comprehensive corporate-action fixtures still needed |
| A16 | Missing quote is null and portfolio partial; stale UI visible; verified session calendar/provider delay integration missing |
| A17 | Browser/UI displays not-found-in-imported-transactions rather than failed-bank claims; full cadence/date-window reconciliation remains limited |
| A18 | Immutable reports, repeated jobs, one-period catch-up pass; email is disabled and hosted schedule remains unconfigured |
| A19 | Tracking, deterministic planning and reports operate without AI key |
| A20 | Evidence-number validator rejects unsupported figures; actual AI provider remains off |
| A21 | Missing identity and cross-owner state/import/audit/export isolation pass; production platform auth and every future entity need extended tests |
| A22 | Browser tested 360×800: planner input/save, manual preview/post, holdings and report access; horizontal tables are contained in scrollable regions |
| A23 | Reports remain frozen after quote correction; tax/category effective-dated rule pipelines not implemented |
| A24 | Missing/no-root and multiple plausible root states tested; conservative non-conventional-flow ambiguity handling |
| A25 | UI uses editable scenarios, not numerical predicted probabilities; no predictive model exists |
| A26 | Workspace erasure and removal from worker source pass; identity revocation and managed backup retention remain platform/operator tasks |

Additional tests: decimal precision limits, FIFO partial sale and oversell, unclosed CSV and duplicate headers, escaped quotes, spreadsheet-safe cell encoder, mapping persistence, closing-unit mismatch atomicity, reversal audit preservation, demo isolation, cross-origin rejection, goal inflation, covered targets, negative return assumptions, overlap and tied percentiles.

Browser QA (15 October 2026): desktop dashboard rendered with 6 synthetic holdings and derived ₹24,84,800 value. At 360px, zero-return 12-month ₹1,000 scenario showed ₹12,000 and required ₹1,000; saving persisted the goal. A synthetic manual purchase was previewed and posted through the mobile dialog. Holdings remained scrollable with essential controls reachable. These test records are local and excluded from source and hosted deployment. A frozen partial weekly report was generated and read through the 360px modal; missing boundary valuations were explicitly unavailable. No page overflow was observed (360px viewport, 345px document content width). Console/visual checks should be repeated after future source changes.

Not benchmarked: 100 holdings / 10,000 transaction p95; ten concurrent sessions; report performance at scale; restore RPO/RTO; browser-specific PWA installation; provider contracts; regulator review. Full Phase 1 gate and Phase 2/3 gates remain open.
