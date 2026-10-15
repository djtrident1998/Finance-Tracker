# Provider capability matrix

| Adapter | Implemented behavior | Coverage / refresh | Activation and limits |
|---|---|---|---|
| Manual / generic CSV | Dated unadjusted price/NAV + provenance; ledger events | User supplied; no history invented | Available now; user verifies source, identity, date and units |
| AMFI NAV text | Fixed official NAV download endpoint, normalized scheme-code matches; three attempts, exponential delay, 15-second timeout; retain prior quotes on failure | Latest published file only; no historical total return, metadata, portfolio or licence assertion | Server flags `AMFI_ENABLED=true` and `AMFI_USAGE_APPROVED=true` only after permitted use is established; manual refresh action; no credentials required for this adapter |
| Licensed stock / ETF data | Explicit unavailable state | Imported prices only | A provider contract, credentials and documented price/corporate-action convention are required; adapter not implemented |
| Scheme master / classifications | Imported exact identity and user category labels | No verified dated category history | Verify current SEBI scheme classification and scheme-level effective mappings; production adapter not implemented |
| Benchmark total returns | Explicit unavailable state | None | Licensed source, dated benchmark history and aligned total-return convention required |
| Fund holdings / TER / managers | Explicit unavailable state; deterministic scoring and overlap library implemented independently | None | Dated disclosures, survivorship treatment and coherent cohorts required; importer not implemented |
| Statement / account transactions | Generic CSV only | User supplied | No CAMS, KFintech, MFCentral, NSDL/CDSL, bank, or broker API connection; no password capture |
| Tax rules | Explicit unavailable state | None | Effective-dated verified jurisdiction, residency, acquisition lots and gains context required; no hardcoded tax constants |
| Email | Disabled | None | Verified destination, consent, private links and an idempotent delivery provider are required |
| AI explanations | Off; evidence-number validator unit-tested | Deterministic UI and reports work independently | No model key requested, no personal data sent |

Primary references checked during build: [AMFI NAV resources](https://www.amfiindia.com/net-asset-value), [SEBI category circular, 26 February 2026](https://www.sebi.gov.in/legal/circulars/feb-2026/categorization-and-rationalization-of-mutual-fund-schemes_99983.html). Public download access is not a production redistribution licence. Provider refresh scheduling and persisted circuit breakers are still to be implemented. Do not activate a data provider based solely on this file.

All NAV results retain source URL, valuation date and retrieval timestamp. Publication time remains unknown when absent. Stock/ETF cash distributions and corporate actions must use one consistent unadjusted convention. The app will not calculate TWR, peer rankings, exact taxes or numerical switch advantage from missing data.
