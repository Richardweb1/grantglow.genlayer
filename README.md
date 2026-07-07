# GrantGlow v2
### AI-powered grant intelligence on GenLayer Bradbury

GrantGlow reviews public funding pages with live web evidence, AI reasoning, and GenLayer validator consensus. It helps users track whether a grant looks open, closed, or unclear, then stores the result on-chain with priority, deadline, eligibility notes, and history.

---

## Live deployment

- App: https://grantglow-genlayer.vercel.app
- Contract: [`0x246BCA74fb7F7E6BA697A69a7Cf6DEe11A25d20D`](https://explorer-bradbury.genlayer.com/address/0x246BCA74fb7F7E6BA697A69a7Cf6DEe11A25d20D)
- Network: GenLayer Bradbury Testnet, chain id `4221`
- Deploy tx: [`0x3d0d1cc8bbae569eb2cc1a9e7ecc4b4a24aa690b175a99da9d56dbe5b6e6b4f9`](https://explorer-bradbury.genlayer.com/tx/0x3d0d1cc8bbae569eb2cc1a9e7ecc4b4a24aa690b175a99da9d56dbe5b6e6b4f9)
- Verified call: [`0x0c99d943f2938e15ab13167a4c00d7e3d75131e662cc7ad3fe24b2c227716e22`](https://explorer-bradbury.genlayer.com/tx/0x0c99d943f2938e15ab13167a4c00d7e3d75131e662cc7ad3fe24b2c227716e22)

---

## What is this?

GrantGlow is a funding dashboard built around a real GenLayer Intelligent Contract. A user submits a grant page and applicant profile. The contract fetches live evidence, asks AI to classify the opportunity, and stores a consensus-backed review.

This v2 milestone expands the original demo into a fuller project with:

- multi-field grant analysis;
- deadline and eligibility extraction;
- priority scoring;
- dashboard counters;
- persistent review history;
- React frontend with transaction tracking.

---

## How it works

1. User calls `review_grant(source_url, program_name, applicant_profile)`.
2. The contract fetches the live page using `gl.nondet.web.get`.
3. AI returns strict JSON: verdict, deadline, eligibility, priority, reasoning.
4. Validators rerun the review and compare bounded verdict + priority codes.
5. If consensus accepts it, the contract updates latest result, counters, and history.

---

## Contract

- File: `contracts/grant_glow.py`
- Class: `GrantGlow`
- Write methods: `review_grant(...)`, `check_grant(...)`
- Read methods: `get_latest_result()`, `get_dashboard()`, `get_count()`

---

## Run locally

```bash
npm install
npm run milestone:check
npm run build
```

---

## Project structure

```text
grantglow-oracle/
├── contracts/grant_glow.py
├── src/App.tsx
├── src/styles.css
├── scripts/milestone-check.ts
├── scripts/check-schema.ts
└── README.md
```
