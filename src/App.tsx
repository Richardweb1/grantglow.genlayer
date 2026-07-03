import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

const CHAIN_ID_HEX = "0x107d";
const EXPLORER = "https://explorer-bradbury.genlayer.com";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "0xbb6FF3B4899c5bEeFF70a3839604E650bF4cB2AE";
const DEFAULT_URL = "https://test-server.genlayer.com/static/genvm/hello.html";
const LIFECYCLE = ["PENDING", "PROPOSING", "COMMITTING", "REVEALING", "ACCEPTED", "FINALIZED"];

type LatestResult = {
  code: number;
  verdict: "OPEN" | "CLOSED" | "UNCLEAR" | "IDLE";
  program: string;
  url: string;
  reasoning: string;
};

const emptyResult: LatestResult = {
  code: 0,
  verdict: "IDLE",
  program: "No program checked yet",
  url: "",
  reasoning: "Your finalized consensus result will glow here.",
};

const readClient = createClient({ chain: testnetBradbury });

function shortAddress(value: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Connect wallet";
}

function getStatus(tx: unknown): string {
  const data = tx as Record<string, unknown> | null;
  const raw = data?.statusName ?? data?.status ?? data?.state ?? "PENDING";
  return String(raw).toUpperCase();
}

function getConsensus(tx: unknown): string {
  const text = JSON.stringify(tx ?? {}).toUpperCase();
  if (text.includes("DISAGREE")) return "DISAGREE";
  if (text.includes("AGREE")) return "AGREE";
  return "IDLE";
}

export default function App() {
  const [account, setAccount] = useState("");
  const [program, setProgram] = useState("GenLayer sample grant");
  const [url, setUrl] = useState(DEFAULT_URL);
  const [latest, setLatest] = useState<LatestResult>(emptyResult);
  const [count, setCount] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState("IDLE");
  const [consensus, setConsensus] = useState("IDLE");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isConfigured = /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);
  const lifecycleIndex = useMemo(() => LIFECYCLE.indexOf(status), [status]);

  const refreshLatest = useCallback(async () => {
    if (!isConfigured) return;
    setRefreshing(true);
    setError("");
    try {
      const [result, total] = await Promise.all([
        readClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_latest_result",
          args: [],
          transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
        }),
        readClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_count",
          args: [],
          transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
        }),
      ]);
      setLatest(JSON.parse(String(result)) as LatestResult);
      setCount(Number(total));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read finalized contract state.");
    } finally {
      setRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    void refreshLatest();
  }, [refreshLatest]);

  useEffect(() => {
    if (!txHash || status === "FINALIZED") return;
    const timer = window.setInterval(async () => {
      try {
        const tx = await readClient.getTransaction({ hash: txHash as never });
        const nextStatus = getStatus(tx);
        setStatus(nextStatus);
        setConsensus(getConsensus(tx));
        if (nextStatus === "FINALIZED") {
          setLoading(false);
          await refreshLatest();
        }
      } catch {
        // A fresh transaction can take a moment to become queryable.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshLatest, status, txHash]);

  async function connectWallet() {
    setError("");
    if (!window.ethereum) {
      setError("Wallet not found. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      await switchNetwork();
      setAccount(accounts[0] ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection was cancelled.");
    }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (cause) {
      const code = (cause as { code?: number }).code;
      if (code !== 4902) throw cause;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "GenLayer Bradbury Testnet",
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: ["https://rpc-bradbury.genlayer.com"],
          blockExplorerUrls: [EXPLORER],
        }],
      });
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!isConfigured) {
      setError("Contract deployment is the next step. Add its Bradbury address first.");
      return;
    }
    if (!account || !window.ethereum) {
      await connectWallet();
      return;
    }
    setLoading(true);
    setTxHash("");
    setStatus("PENDING");
    setConsensus("IDLE");
    try {
      await switchNetwork();
      const writeClient = createClient({
        chain: testnetBradbury,
        account: account as `0x${string}`,
        provider: window.ethereum as never,
      });
      const hash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "check_grant",
        args: [url.trim(), program.trim()],
        value: 0n,
      });
      setTxHash(hash);
    } catch (cause) {
      setLoading(false);
      setStatus("IDLE");
      setError(cause instanceof Error ? cause.message : "Transaction could not be sent.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GrantGlow home">
          <span className="brand-mark"><Sparkles size={20} strokeWidth={2.4} /></span>
          <span>GrantGlow</span>
        </a>
        <button className="wallet-button" type="button" onClick={connectWallet}>
          <Wallet size={18} />
          <span>{shortAddress(account)}</span>
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><CircleDot size={15} /> LIVE WEB × AI CONSENSUS</div>
          <h1>Is the grant <span>still open?</span></h1>
          <p className="hero-copy">Paste the official page. GenLayer validators independently read it, judge the evidence, and agree on one clear answer.</p>
          <div className="network-pill"><span /> Bradbury Testnet · Chain 4221</div>
        </section>

        <section className="workspace" aria-label="Grant checker">
          <form className="checker-card" onSubmit={submit}>
            <div className="card-heading">
              <div>
                <p className="step-label">01 / CHECK A SOURCE</p>
                <h2>Give us the official page</h2>
              </div>
              <Search size={25} aria-hidden="true" />
            </div>

            <label htmlFor="program">Program name</label>
            <input id="program" value={program} onChange={(e) => setProgram(e.target.value)} required minLength={2} maxLength={80} />

            <label htmlFor="source">Official source URL</label>
            <input id="source" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required maxLength={300} />
            <p className="field-note">Public HTTPS text or JSON works best. The contract reads up to 12 KB.</p>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <RefreshCw className="spin" size={20} /> : <Sparkles size={20} />}
              {loading ? "Validators are checking…" : account ? "Ask the validator network" : "Connect wallet to check"}
              {!loading && <ArrowUpRight size={20} />}
            </button>
          </form>

          <article className={`result-card verdict-${latest.verdict.toLowerCase()}`}>
            <div className="card-heading">
              <div>
                <p className="step-label">02 / FINALIZED RESULT</p>
                <h2>Consensus glow</h2>
              </div>
              <button className="icon-button" type="button" onClick={refreshLatest} disabled={refreshing || !isConfigured} aria-label="Refresh finalized result">
                <RefreshCw className={refreshing ? "spin" : ""} size={20} />
              </button>
            </div>
            <div className="verdict-orb"><span>{latest.verdict}</span></div>
            <p className="result-program">{latest.program}</p>
            <p className="reasoning">{latest.reasoning}</p>
            <div className="result-meta">
              <span><CheckCircle2 size={17} /> {count} finalized checks</span>
              {latest.url && <a href={latest.url} target="_blank" rel="noreferrer">View evidence <ExternalLink size={15} /></a>}
            </div>
          </article>
        </section>

        <section className="lifecycle-card" aria-label="Transaction lifecycle">
          <div className="lifecycle-heading">
            <div>
              <p className="step-label">03 / TRANSACTION LIFECYCLE</p>
              <h2>{txHash ? "Follow every consensus round" : "Ready for the first transaction"}</h2>
            </div>
            <span className={`consensus-badge ${consensus.toLowerCase()}`}>{consensus}</span>
          </div>
          <div className="timeline">
            {LIFECYCLE.map((item, index) => (
              <div className={`timeline-step ${index <= lifecycleIndex ? "active" : ""}`} key={item}>
                <span>{index + 1}</span><small>{item}</small>
              </div>
            ))}
          </div>
          {txHash ? (
            <a className="hash-link" href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
              <span>{txHash}</span><ExternalLink size={17} />
            </a>
          ) : (
            <p className="empty-hash">The full transaction hash will appear here after wallet confirmation.</p>
          )}
        </section>

        <section className="how-grid">
          <article><span>01</span><h3>Fetch live</h3><p>Every validator independently reads the same public source.</p></article>
          <article><span>02</span><h3>Judge with AI</h3><p>The model uses only fetched evidence and returns strict JSON.</p></article>
          <article><span>03</span><h3>Agree on-chain</h3><p>Only the bounded verdict is compared before storage updates.</p></article>
        </section>
      </main>

      <footer>
        <span>GrantGlow on GenLayer</span>
        {isConfigured ? <a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">View contract <ExternalLink size={14} /></a> : <span>Awaiting Studio deployment</span>}
      </footer>
    </div>
  );
}
