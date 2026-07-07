# GrantGlow v2

GrantGlow is a GenLayer funding-intelligence project that monitors public grant pages, evaluates live evidence with validator consensus, and stores a persistent dashboard of funding reviews on-chain.

## Milestone upgrade

The original GrantGlow proof of concept only classified one source as `OPEN`, `CLOSED`, or `UNCLEAR`. This milestone expands it into a fuller GenLayer project:

- upgraded Intelligent Contract with multi-field grant analysis;
- new `review_grant(source_url, program_name, applicant_profile)` workflow;
- validator agreement over both funding verdict and priority score;
- deadline extraction, applicant-fit note, evidence reasoning, and priority level;
- persistent dashboard counters for total/open/closed/unclear/high-priority reviews;
- bounded on-chain history log of finalized grant records;
- backward-compatible `check_grant(source_url, program_name)` entry point;
- redesigned React dashboard with metrics, history, lifecycle tracking, and evidence panels;
- milestone verification script and production deployment documentation.

## How the GenLayer contract works

1. A user submits an official public funding URL, a program name, and an applicant profile.
2. The leader fetches live evidence with `gl.nondet.web.get`.
3. AI extracts strict JSON:
   - verdict: `OPEN`, `CLOSED`, or `UNCLEAR`
   - deadline
   - eligibility note
   - priority: `HIGH`, `MEDIUM`, or `LOW`
   - evidence reasoning
4. Every validator independently fetches the same source and reruns the judgment.
5. `gl.vm.run_nondet_unsafe` accepts the update only when validators agree on the bounded verdict code and priority code.
6. The contract updates dashboard counters and appends a compact history entry.

There is no simulated validator loop. The live web evidence and validator comparison happen inside the GenLayer Intelligent Contract.

## Contract

- Studio filename: `grant_glow.py`
- Class: `GrantGlow`
- Constructor: no arguments
- Primary write: `review_grant(source_url, program_name, applicant_profile)`
- Backward-compatible write: `check_grant(source_url, program_name)`
- Views:
  - `get_latest_result()`
  - `get_dashboard()`
  - `get_count()`

Result codes:

- `1 = OPEN`
- `2 = CLOSED`
- `3 = UNCLEAR`

Priority codes:

- `1 = LOW`
- `2 = MEDIUM`
- `3 = HIGH`

Source: [`contracts/grant_glow.py`](contracts/grant_glow.py)

## Frontend

The React app is now a funding operations dashboard:

- wallet connection and Bradbury network switching;
- live contract reads for latest result, count, and dashboard state;
- write transaction through `review_grant`;
- transaction lifecycle panel;
- on-chain metrics cards;
- stored review history panel;
- evidence source links and applicant-fit explanation.

## Network

Current deployed v2 contract:

- Network: GenLayer Bradbury Testnet
- Chain ID: `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Contract address: `0x246BCA74fb7F7E6BA697A69a7Cf6DEe11A25d20D`
- Contract explorer: https://explorer-bradbury.genlayer.com/address/0x246BCA74fb7F7E6BA697A69a7Cf6DEe11A25d20D
- Deployment transaction: `0x3d0d1cc8bbae569eb2cc1a9e7ecc4b4a24aa690b175a99da9d56dbe5b6e6b4f9`
- Deployment explorer: https://explorer-bradbury.genlayer.com/tx/0x3d0d1cc8bbae569eb2cc1a9e7ecc4b4a24aa690b175a99da9d56dbe5b6e6b4f9
- Live app: https://grantglow-genlayer.vercel.app

Run several real funding reviews from the frontend so the dashboard/history panels show fresh milestone evidence for this v2 deployment.

## Local development

```bash
npm install
npm run typecheck
npm run milestone:check
npm run build
```

Optional schema check against Bradbury:

```bash
npm run schema:check
```

## Files

- `contracts/grant_glow.py` — upgraded GenLayer Intelligent Contract
- `src/App.tsx` — React dashboard and GenLayer integration
- `src/styles.css` — responsive visual system
- `scripts/milestone-check.ts` — static milestone coverage check
- `scripts/check-schema.ts` — GenLayer schema check
- `scripts/verify-deployment.ts` — deployed state verification helper
- `scripts/inspect-transaction.ts` — finalized transaction inspection helper

## Suggested resubmission note

GrantGlow v2 is a milestone upgrade from a simple funding-status demo into a fuller GenLayer project. The upgraded Intelligent Contract now performs multi-field live grant analysis, validates both verdict and priority through GenLayer consensus, stores deadline and eligibility evidence, maintains dashboard counters, and preserves an on-chain review history. The React frontend was rebuilt as a funding operations dashboard connected to the contract, with transaction lifecycle tracking, metrics, latest finalized intelligence, and evidence history.
