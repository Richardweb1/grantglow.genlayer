import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

const hash = process.argv[2];
const address = process.argv[3] as `0x${string}`;
if (!hash || !address) throw new Error("Usage: inspect-transaction TX_HASH CONTRACT_ADDRESS");

const client = createClient({ chain: testnetBradbury });
const transaction = await client.getTransaction({ hash: hash as never });
let trace: unknown;
try {
  trace = await client.debugTraceTransaction({ hash: hash as never, round: 0 });
} catch (error) {
  trace = { error: error instanceof Error ? error.message : String(error) };
}

const acceptedState = await Promise.all([
  client.readContract({
    address,
    functionName: "get_latest_result",
    args: [],
    transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
  }),
  client.readContract({
    address,
    functionName: "get_count",
    args: [],
    transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
  }),
]).catch((error) => [`READ_ERROR: ${error instanceof Error ? error.message : String(error)}`, null]);

console.log(JSON.stringify({ transaction, trace, acceptedState }, (_, value) =>
  typeof value === "bigint" ? value.toString() : value, 2));
