# GrantGlow

GrantGlow is a small GenLayer intelligent contract and React app that checks whether a public grant or funding program is currently `OPEN`, `CLOSED`, or `UNCLEAR`.

## How it works

1. The user submits a program name and its official HTTPS source.
2. The leader fetches up to 8 KB of live web evidence with `gl.nondet.web.get`.
3. AI judges only that evidence and returns strict JSON.
4. Every validator independently fetches and judges the source again.
5. `gl.vm.run_nondet_unsafe` compares only the bounded integer verdict. Storage changes only after consensus.

There is no manual or simulated validator loop.

## Contract

- Studio filename: `grant_glow.py`
- Class: `GrantGlow`
- Constructor: no arguments
- Result codes: `1 = OPEN`, `2 = CLOSED`, `3 = UNCLEAR`
- Public write: `check_grant(source_url, program_name)`
- Public views: `get_latest_result()` and `get_count()`

Source: [`contracts/grant_glow.py`](contracts/grant_glow.py)

## Network

- Network: GenLayer Bradbury Testnet
- Chain ID: `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: `https://explorer-bradbury.genlayer.com`
- Contract address: `0xbb6FF3B4899c5bEeFF70a3839604E650bF4cB2AE`
- Contract explorer: https://explorer-bradbury.genlayer.com/address/0xbb6FF3B4899c5bEeFF70a3839604E650bF4cB2AE
- Deployment transaction: `0xca12491fc6207a0370c44987c9a9e3e5e12ab87c5fb01052a78a6796051b345f`
- Deployment explorer: https://explorer-bradbury.genlayer.com/tx/0xca12491fc6207a0370c44987c9a9e3e5e12ab87c5fb01052a78a6796051b345f
- Deployment status: `FINALIZED + AGREE + FINISHED_WITH_RETURN`
- Verified contract call: `0x5faa2df708cf70cbfbe68a2659f7aed792d0a6d1078de686880d726f72611686`
- Contract call explorer: https://explorer-bradbury.genlayer.com/tx/0x5faa2df708cf70cbfbe68a2659f7aed792d0a6d1078de686880d726f72611686
- Contract call status: `FINALIZED + AGREE + FINISHED_WITH_RETURN`
- Execution trace: `result_code = 0`, empty `stderr`, no revert
- Finalized state: `UNCLEAR`, check count `1`

## Local development

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Copy `.env.example` to `.env` only after deployment and set `VITE_CONTRACT_ADDRESS` to the new Bradbury contract.

## Storage and consensus notes

The contract stores bounded result codes as a `u64` (`1 = OPEN`, `2 = CLOSED`, `3 = UNCLEAR`) and keeps the program, source URL, and short reasoning as strings. `get_latest_result()` exposes the finalized result and `get_count()` exposes the number of successful checks.

The leader and every validator independently fetch the live source and run AI judgment. Validators compare only the bounded integer verdict. There is no manual validator loop or simulated validator consensus.

## Links

- Live app: https://grantglow-genlayer.vercel.app
- GitHub repository: https://github.com/Richardweb1/grantglow.genlayer
