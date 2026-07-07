import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  History,
  Layers3,
  RefreshCw,
  ShieldCheck,
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
  priority_code?: number;
  priority?: "HIGH" | "MEDIUM" | "LOW" | "IDLE";
  program: string;
  url: string;
  deadline?: string;
  eligibility?: string;
  reasoning: string;
};

type Dashboard = {
  total: number;
  open: number;
  closed: number;
  unclear: number;
  high_priority: number;
  latest_verdict: string;
  latest_priority: string;
  history: string;
};

type HistoryEntry = {
  id: number;
  verdict: string;
  priority: string;
  program: string;
  deadline: string;
  url: string;
};

const emptyResult: LatestResult = {
  code: 0,
  verdict: "IDLE",
  priority: "IDLE",
  program: "No program reviewed yet",
  url: "",
  deadline: "UNKNOWN",
  eligibility: "Run a funding review to store applicant-fit evidence on-chain.",
  reasoning: "GrantGlow v2 tracks funding status, priority, deadline evidence, and validator-approved history.",
};

const emptyDashboard: Dashboard = {
  total: 0,
  open: 0,
  closed: 0,
  unclear: 0,
  high_priority: 0,
  latest_verdict: "IDLE",
  latest_priority: "IDLE",
  history: "",
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
  return "WAITING";
}

function parseHistory(raw: string): HistoryEntry[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => {
      try {
        return JSON.parse(line) as HistoryEntry;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse()
    .slice(0, 6) as HistoryEntry[];
}

export default function App() {
  const [account, setAccount] = useState("");
  const [program, setProgram] = useState("Neighborhood innovation fund");
  const [url, setUrl] = useState(DEFAULT_URL);
  const [profile, setProfile] = useState("early-stage civic tech builder looking for non-dilutive grants");
  const [latest, setLatest] = useState<LatestResult>(emptyResult);
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState("IDLE");
  const [consensus, setConsensus] = useState("WAITING");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const isConfigured = /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);
  const lifecycleIndex = useMemo(() => Math.max(0, LIFECYCLE.indexOf(status)), [status]);
  const history = useMemo(() => parseHistory(dashboard.history), [dashboard.history]);

  const refreshLatest = useCallback(async () => {
    if (!isConfigured) return;
    setRefreshing(true);
    setError("");
    try {
      const [result, total, dash] = await Promise.all([
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
        readClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_dashboard",
          args: [],
          transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
        }).catch(() => ""),
      ]);

      setLatest({ ...emptyResult, ...(JSON.parse(String(result)) as LatestResult) });
      if (dash) {
        setDashboard(JSON.parse(String(dash)) as Dashboard);
      } else {
        setDashboard({ ...emptyDashboard, total: Number(total) });
      }
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
        // Fresh transactions can take a moment to become queryable.
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
      setError("Deploy the upgraded GrantGlow contract and add its Bradbury address first.");
      return;
    }
    if (!account || !window.ethereum) {
      await connectWallet();
      return;
    }
    setLoading(true);
    setTxHash("");
    setStatus("PENDING");
    setConsensus("WAITING");
    try {
      await switchNetwork();
      const writeClient = createClient({
        chain: testnetBradbury,
        account: account as `0x${string}`,
        provider: window.ethereum as never,
      });
      const hash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "review_grant",
        args: [url.trim(), program.trim(), profile.trim()],
        value: 0n,
      });
      setTxHash(hash);
    } catch (cause) {
      setLoading(false);
      setStatus("IDLE");
      setError(cause instanceof Error ? cause.message : "Transaction could not be sent.");
    }
  }

  const metrics = [
    { label: "Total reviews", value: dashboard.total, icon: BarChart3 },
    { label: "Open grants", value: dashboard.open, icon: CheckCircle2 },
    { label: "High priority", value: dashboard.high_priority, icon: Activity },
    { label: "Unclear / closed", value: dashboard.unclear + dashboard.closed, icon: ShieldCheck },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GrantGlow home">
          <span className="brand-mark"><Layers3 size={21} strokeWidth={2.3} /></span>
          <span>GrantGlow v2</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#review">Review</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#history">Evidence</a>
        </nav>
        <button className="wallet-button" type="button" onClick={connectWallet}>
          <Wallet size={18} />
          <span>{shortAddress(account)}</span>
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy-block">
            <p className="eyebrow"><Sparkles size={15} /> AUTONOMOUS FUNDING INTELLIGENCE</p>
            <h1>Track grant opportunities with validator-backed evidence.</h1>
            <p className="hero-copy">
              GrantGlow now works like a small funding operations desk: it checks live public pages,
              scores urgency, stores applicant-fit notes, and keeps a consensus history on GenLayer.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#review">Run funding review <ArrowUpRight size={18} /></a>
              <a className="secondary-link" href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">
                View contract <ExternalLink size={17} />
              </a>
            </div>
          </div>
          <aside className="hero-panel" aria-label="Project milestone summary">
            <p className="panel-kicker">Milestone scope</p>
            <div className="panel-stack">
              <span>Multi-field AI contract review</span>
              <span>Consensus priority scoring</span>
              <span>On-chain dashboard counters</span>
              <span>Persistent review history</span>
            </div>
          </aside>
        </section>

        <section className="metric-grid" id="dashboard" aria-label="Funding dashboard metrics">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <metric.icon size={22} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="workspace" id="review" aria-label="Grant review workspace">
          <form className="review-card" onSubmit={submit}>
            <div className="section-heading">
              <p className="step-label">01 / REVIEW A FUNDING SOURCE</p>
              <h2>Live grant intake</h2>
              <span><FileSearch size={22} /></span>
            </div>

            <label htmlFor="program">Program name</label>
            <input id="program" value={program} onChange={(event) => setProgram(event.target.value)} required minLength={2} maxLength={80} />

            <label htmlFor="source">Official source URL</label>
            <input id="source" type="url" value={url} onChange={(event) => setUrl(event.target.value)} required maxLength={300} />

            <label htmlFor="profile">Applicant profile</label>
            <textarea id="profile" value={profile} onChange={(event) => setProfile(event.target.value)} required maxLength={280} />
            <p className="field-note">The contract compares live evidence against this profile and stores a short eligibility note.</p>

            {error && <div className="error-message" role="alert">{error}</div>}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <RefreshCw className="spin" size={20} /> : <Sparkles size={20} />}
              {loading ? "Validators are reviewing…" : account ? "Submit review to GenLayer" : "Connect wallet to review"}
              {!loading && <ArrowUpRight size={20} />}
            </button>
          </form>

          <article className={`result-card verdict-${latest.verdict.toLowerCase()}`}>
            <div className="section-heading">
              <p className="step-label">02 / LATEST FINALIZED INTELLIGENCE</p>
              <h2>{latest.program}</h2>
              <button className="icon-button" type="button" onClick={refreshLatest} disabled={refreshing || !isConfigured} aria-label="Refresh finalized result">
                <RefreshCw className={refreshing ? "spin" : ""} size={20} />
              </button>
            </div>

            <div className="verdict-row">
              <div>
                <span className="mini-label">Verdict</span>
                <strong>{latest.verdict}</strong>
              </div>
              <div>
                <span className="mini-label">Priority</span>
                <strong>{latest.priority ?? "IDLE"}</strong>
              </div>
              <div>
                <span className="mini-label">Deadline</span>
                <strong>{latest.deadline ?? "UNKNOWN"}</strong>
              </div>
            </div>

            <div className="insight-box">
              <span><ShieldCheck size={18} /> Eligibility signal</span>
              <p>{latest.eligibility}</p>
            </div>
            <div className="insight-box">
              <span><Clock3 size={18} /> Evidence reasoning</span>
              <p>{latest.reasoning}</p>
            </div>
            {latest.url && <a className="evidence-link" href={latest.url} target="_blank" rel="noreferrer">Open evidence source <ExternalLink size={15} /></a>}
          </article>
        </section>

        <section className="operations-grid">
          <article className="lifecycle-card" aria-label="Transaction lifecycle">
            <div className="section-heading">
              <p className="step-label">03 / CONSENSUS LIFECYCLE</p>
              <h2>{txHash ? "Tracking current review" : "Ready for next review"}</h2>
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
              <p className="empty-hash">After wallet confirmation, the full transaction hash and explorer link appear here.</p>
            )}
          </article>

          <article className="history-card" id="history">
            <div className="section-heading">
              <p className="step-label">04 / STORED REVIEW HISTORY</p>
              <h2>Latest grant records</h2>
              <span><History size={22} /></span>
            </div>
            {history.length ? (
              <div className="history-list">
                {history.map((item) => (
                  <a href={item.url} target="_blank" rel="noreferrer" className="history-item" key={`${item.id}-${item.program}`}>
                    <span>#{item.id}</span>
                    <strong>{item.program}</strong>
                    <small>{item.verdict} · {item.priority} · {item.deadline || "UNKNOWN"}</small>
                  </a>
                ))}
              </div>
            ) : (
              <p className="empty-history">No v2 history yet. Deploy the upgraded contract, run a few reviews, and this panel becomes live milestone evidence.</p>
            )}
          </article>
        </section>
      </main>

      <footer>
        <span>GrantGlow v2 · GenLayer Bradbury Testnet</span>
        <a href="https://github.com/Richardweb1/grantglow.genlayer" target="_blank" rel="noreferrer">GitHub repository <ExternalLink size={14} /></a>
      </footer>
    </div>
  );
}
