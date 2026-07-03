import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const filename = process.argv[2];
const bytes = filename
  ? await readFile(resolve(filename))
  : await readFile(new URL("../contracts/grant_glow.py", import.meta.url));
const contractCode = new Uint8Array(bytes);
const client = createClient({ chain: testnetBradbury });
const schema = await client.getContractSchemaForCode(contractCode);
console.log(JSON.stringify(schema, null, 2));
