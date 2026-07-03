import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const address = process.argv[2] as `0x${string}`;
const hash = process.argv[3];

if (!address || !hash) {
  throw new Error("Usage: tsx scripts/verify-deployment.ts ADDRESS TX_HASH");
}

const client = createClient({ chain: testnetBradbury });
const [transaction, latestResult, count] = await Promise.all([
  client.getTransaction({ hash: hash as never }),
  client.readContract({ address, functionName: "get_latest_result", args: [] }),
  client.readContract({ address, functionName: "get_count", args: [] }),
]);

console.log(JSON.stringify({ transaction, latestResult, count }, (_, value) =>
  typeof value === "bigint" ? value.toString() : value, 2));
