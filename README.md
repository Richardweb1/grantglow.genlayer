# GrantGlow v2

GrantGlow is a GenLayer app for checking public grant opportunities with live web evidence and AI-validator consensus.

## What changed in v2

- New contract workflow: `review_grant(source_url, program_name, applicant_profile)`
- Extracts verdict, deadline, eligibility note, priority, and reasoning
- Validators compare bounded verdict + priority codes before state updates
- Stores dashboard counters and a compact review history on-chain
- React frontend rebuilt as a funding dashboard with metrics, history, and tx tracking

## GenLayer contract

- File: `contracts/grant_glow.py`
- Class: `GrantGlow`
- Writes: `review_grant(...)`, `check_grant(...)`
- Views: `get_latest_result()`, `get_dashboard()`, `get_count()`

## Deployment

- Network: GenLayer Bradbury Testnet
- Contract: `0x246BCA74fb7F7E6BA697A69a7Cf6DEe11A25d20D`
- Deploy tx: `0x3d0d1cc8bbae569eb2cc1a9e7ecc4b4a24aa690b175a99da9d56dbe5b6e6b4f9`
- Live app: https://grantglow-genlayer.vercel.app
- Explorer: https://explorer-bradbury.genlayer.com/address/0x246BCA74fb7F7E6BA697A69a7Cf6DEe11A25d20D

## Run locally

```bash
npm install
npm run milestone:check
npm run build
```

## Submission note

GrantGlow v2 upgrades the original grant-status demo into a fuller GenLayer funding dashboard. The contract now performs multi-field live grant analysis, stores persistent review metrics/history, and validates both verdict and priority through GenLayer consensus.
