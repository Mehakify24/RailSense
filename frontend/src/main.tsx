import React from "react";
import ReactDOM from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Download,
  FileText,
  Gauge,
  GitBranch,
  History,
  Landmark,
  LineChart,
  Map,
  RadioTower,
  Route,
  ShieldCheck,
  Sparkles,
  Train,
  Waves,
  Zap,
} from "lucide-react";
import ReactFlow, { Background, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/live";

type Station = { name: string; x: number; y: number };
type TrainState = { id: string; name: string; x: number; y: number; from: string; to: string; progress: number };
type Reading = { timestamp: string; location: string; sensor_type: string; value: number; unit: string; status: string };
type Alert = { id: number; location: string; type: string; severity: string; action: string; affected_trains: string };
type AgentStep = { stage: string; summary: string; timestamp: string };
type LivePayload = {
  timestamp: string;
  stations: Station[];
  routes: [string, string][];
  trains: TrainState[];
  readings: Reading[];
  alerts: Alert[];
  agent: AgentStep[];
  active_scenario?: string;
};
type Incident = {
  id: number;
  timestamp: string;
  location: string;
  incident_type: string;
  severity: string;
  cause: string;
  action_taken: string;
  affected_trains: string;
  reasoning: string;
  timeline: string;
};

const nav = [
  ["landing", "Overview", Sparkles],
  ["command", "Command", Map],
  ["digital", "Digital Twin", Zap],
  ["memory", "Memory", History],
  ["future", "Future", LineChart],
  ["reports", "Reports", FileText],
] as const;

const stationNames = ["Delhi", "Agra", "Jhansi", "Bhopal", "Nagpur", "Lucknow", "Kanpur"];
const scenarios = [
  { name: "Flood", icon: Waves },
  { name: "Earthquake", icon: Activity },
  { name: "Track Crack", icon: Route },
  { name: "Signal Failure", icon: RadioTower },
  { name: "Bridge Failure", icon: Landmark },
];

function useLiveData() {
  const [payload, setPayload] = React.useState<LivePayload | null>(null);
  const [history, setHistory] = React.useState<Reading[]>([]);
  React.useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as LivePayload;
      setPayload(data);
      setHistory((current) => [...data.readings.slice(0, 20), ...current].slice(0, 220));
    };
    return () => ws.close();
  }, []);
  return { payload, history };
}

function App() {
  const [page, setPage] = React.useState<(typeof nav)[number][0]>("landing");
  const live = useLiveData();
  return (
    <main className="min-h-screen overflow-hidden bg-void text-snow">
      <div className="aurora" />
      <Shell page={page} setPage={setPage}>
        <AnimatePresence mode="wait">
          {page === "landing" && <Landing key="landing" setPage={setPage} live={live.payload} />}
          {page === "command" && <CommandCenter key="command" live={live.payload} history={live.history} />}
          {page === "digital" && <DigitalTwin key="digital" live={live.payload} />}
          {page === "memory" && <Memory key="memory" />}
          {page === "future" && <Future key="future" />}
          {page === "reports" && <Reports key="reports" />}
        </AnimatePresence>
      </Shell>
    </main>
  );
}

function Shell({
  children,
  page,
  setPage,
}: {
  children: React.ReactNode;
  page: string;
  setPage: (page: (typeof nav)[number][0]) => void;
}) {
  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl lg:block">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-cyan/15 shadow-glow">
            <Brain className="text-cyan" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan">Shinkansen</p>
            <h1 className="text-xl font-semibold">Brain</h1>
          </div>
        </div>
        <nav className="mt-10 space-y-2">
          {nav.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setPage(id)} className={`nav-button ${page === id ? "active" : ""}`}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-10 rounded-lg border border-cyan/20 bg-cyan/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan">Autonomy loop</p>
          <p className="mt-3 text-sm text-slate-300">Detect &gt; Reason &gt; Decide &gt; Act &gt; Report</p>
        </div>
      </aside>
      <section className="flex-1 px-4 py-4 md:px-8 lg:px-10">
        <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
          {nav.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setPage(id)} className={`mobile-tab ${page === id ? "active" : ""}`}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        {children}
      </section>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.div>
  );
}

function Landing({ setPage, live }: { setPage: (page: (typeof nav)[number][0]) => void; live: LivePayload | null }) {
  return (
    <Page>
      <section className="grid min-h-[calc(100vh-2rem)] content-center gap-8 py-8 xl:grid-cols-[1fr_620px] xl:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-4 py-2 text-sm text-cyan">
            <ShieldCheck size={16} /> Autonomous Railway Intelligence Operating System
          </div>
          <h2 className="mt-8 max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">Shinkansen Brain</h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Predict failures, simulate disasters, learn from incidents, execute autonomous railway actions, and generate black-box investigation reports before accidents happen.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="primary-button" onClick={() => setPage("command")}>
              <Train size={18} /> Enter Command Center
            </button>
            <button className="ghost-button" onClick={() => setPage("digital")}>
              <Zap size={18} /> Run Digital Twin
            </button>
          </div>
          <div className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            <Metric label="Live trains" value={live?.trains.length ?? 3} />
            <Metric label="Sensor ticks" value={live?.readings.length ?? 35} />
            <Metric label="Active alerts" value={live?.alerts.length ?? 0} danger />
          </div>
        </div>
        <div className="relative">
          <RailwayMap live={live} large />
        </div>
      </section>
    </Page>
  );
}

function CommandCenter({ live, history }: { live: LivePayload | null; history: Reading[] }) {
  const chart = history
    .filter((r) => r.sensor_type === "track_vibration" || r.sensor_type === "bridge_stress")
    .slice(0, 38)
    .reverse()
    .map((r, index) => ({ index, sensor: r.sensor_type.replace("_", " "), value: r.value, location: r.location }));
  return (
    <Page>
      <Header eyebrow="Railway Command Center" title="Live autonomous operations" detail="Animated railway network, moving trains, sensor nodes, route risk, and AI intervention loop." />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <RailwayMap live={live} large />
        <AgentPanel steps={live?.agent ?? []} alerts={live?.alerts ?? []} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel title="Live Sensor Network" icon={Gauge} className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <RLineChart data={chart}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="index" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ background: "#08121A", border: "1px solid rgba(0,212,255,.2)", color: "#F5F7FA" }} />
                <Line type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={2} dot={false} />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Instant Alerts" icon={AlertTriangle}>
          <AlertList alerts={live?.alerts ?? []} />
        </Panel>
      </div>
    </Page>
  );
}

function RailwayMap({ live, large = false }: { live: LivePayload | null; large?: boolean }) {
  const stations = live?.stations ?? stationNames.map((name, index) => ({ name, x: 12 + index * 12, y: 25 + (index % 4) * 12 }));
  const routes = live?.routes ?? [];
  const lookup = Object.fromEntries(stations.map((s) => [s.name, s]));
  return (
    <Panel title="National Rail Nervous System" icon={Map} className={large ? "min-h-[530px]" : ""}>
      <div className="relative h-[480px] overflow-hidden rounded-lg border border-white/10 bg-[#06111A]">
        <svg className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="routeGlow" x1="0" x2="1">
              <stop offset="0%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#00E676" />
            </linearGradient>
          </defs>
          {routes.map(([from, to]) => {
            const a = lookup[from];
            const b = lookup[to];
            if (!a || !b) return null;
            return <line key={`${from}-${to}`} x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`} className="route-line" />;
          })}
          {stations.map((station) => (
            <g key={station.name}>
              <circle cx={`${station.x}%`} cy={`${station.y}%`} r="9" className="sensor-pulse" />
              <circle cx={`${station.x}%`} cy={`${station.y}%`} r="4" fill="#00D4FF" />
            </g>
          ))}
        </svg>
        {stations.map((station) => (
          <div key={station.name} className="station-label" style={{ left: `${station.x}%`, top: `${station.y}%` }}>
            {station.name}
          </div>
        ))}
        {(live?.trains ?? []).map((train) => (
          <motion.div key={train.id} className="train-dot" animate={{ left: `${train.x}%`, top: `${train.y}%` }} transition={{ duration: 1.4, ease: "linear" }}>
            <Train size={18} />
          </motion.div>
        ))}
        {(live?.alerts ?? []).map((alert, index) => {
          const station = lookup[alert.location];
          if (!station) return null;
          return (
            <motion.div key={alert.id} className="incident-marker" style={{ left: `${station.x}%`, top: `${station.y}%` }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
              {index + 1}
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}

function AgentPanel({ steps, alerts }: { steps: AgentStep[]; alerts: Alert[] }) {
  const nodes: Node[] = ["DETECT", "REASON", "DECIDE", "ACT", "REPORT"].map((stage, index) => ({
    id: stage,
    position: { x: 20 + index * 135, y: 40 + (index % 2) * 40 },
    data: { label: stage },
    className: "flow-node",
  }));
  const edges: Edge[] = ["DETECT-REASON", "REASON-DECIDE", "DECIDE-ACT", "ACT-REPORT"].map((id) => {
    const [source, target] = id.split("-");
    return { id, source, target, animated: true, style: { stroke: "#00D4FF" } };
  });
  return (
    <Panel title="Shinkansen Brain Agent" icon={Brain}>
      <div className="h-40 rounded-lg border border-white/10 bg-black/20">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} zoomOnScroll={false} panOnDrag={false}>
          <Background color="rgba(0,212,255,.12)" />
        </ReactFlow>
      </div>
      <div className="mt-4 space-y-3">
        {(steps.length ? steps : defaultSteps(alerts)).map((step, index) => (
          <motion.div key={`${step.stage}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            <p className="text-xs font-semibold text-cyan">{step.stage}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{step.summary}</p>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

function DigitalTwin({ live }: { live: LivePayload | null }) {
  const [location, setLocation] = React.useState("Jhansi");
  const [lastIncident, setLastIncident] = React.useState<Incident | null>(null);
  async function runScenario(scenario: string) {
    const res = await fetch(`${API_URL}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, location }),
    });
    setLastIncident(await res.json());
  }
  return (
    <Page>
      <Header eyebrow="Digital Twin Simulator" title="Stress test the railway before reality does" detail="Trigger disasters, watch affected routes light up, and inspect autonomous mitigation." />
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Scenario Controls" icon={Zap}>
          <div className="mb-5 flex flex-wrap gap-2">
            {stationNames.map((name) => (
              <button key={name} onClick={() => setLocation(name)} className={`chip ${location === name ? "active" : ""}`}>
                {name}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenarios.map(({ name, icon: Icon }) => (
              <button key={name} className="scenario-button" onClick={() => runScenario(name)}>
                <Icon size={18} /> {name}
              </button>
            ))}
          </div>
          {lastIncident && (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 p-4">
              <p className="text-sm text-danger">Scenario injected: {lastIncident.incident_type}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{lastIncident.action_taken}</p>
            </div>
          )}
        </Panel>
        <RailwayMap live={live} large />
      </div>
      <div className="mt-5">
        <AgentPanel steps={live?.agent ?? []} alerts={live?.alerts ?? []} />
      </div>
    </Page>
  );
}

function Memory() {
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  const [summary, setSummary] = React.useState<any>({ severity: [], locations: [], types: [] });
  React.useEffect(() => {
    fetch(`${API_URL}/incidents`).then((r) => r.json()).then(setIncidents);
    fetch(`${API_URL}/memory/summary`).then((r) => r.json()).then(setSummary);
  }, []);
  return (
    <Page>
      <Header eyebrow="Railway Memory" title="The network learns from every failure" detail="Historical incidents, location clusters, severity trends, and previous autonomous responses." />
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Severity Trend" icon={Activity}>
          <MiniPie data={summary.severity} />
        </Panel>
        <Panel title="Failure Locations" icon={Map} className="xl:col-span-2">
          <Bars data={summary.locations} />
        </Panel>
      </div>
      <div className="mt-5 grid gap-3">
        {incidents.slice(0, 12).map((incident) => (
          <IncidentRow key={incident.id} incident={incident} />
        ))}
      </div>
    </Page>
  );
}

function Future() {
  const [year, setYear] = React.useState(2032);
  const [projection, setProjection] = React.useState<any>(null);
  React.useEffect(() => {
    fetch(`${API_URL}/future/${year}`).then((r) => r.json()).then(setProjection);
  }, [year]);
  const data = projection
    ? [
        { name: "Passengers", value: projection.passenger_growth },
        { name: "Congestion", value: projection.congestion },
        { name: "Infra load", value: projection.infrastructure_load },
      ]
    : [];
  return (
    <Page>
      <Header eyebrow="Future Simulator" title="Plan the railway from 2026 to 2040" detail="Passenger growth, congestion pressure, infrastructure load, and investment recommendations." />
      <Panel title={`Strategic year ${year}`} icon={Clock}>
        <input aria-label="Future year" className="w-full accent-cyan" min={2026} max={2040} value={year} onChange={(e) => setYear(Number(e.target.value))} type="range" />
        <div className="mt-6 h-80">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="name" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip contentStyle={{ background: "#08121A", border: "1px solid rgba(0,212,255,.2)" }} />
              <Area dataKey="value" stroke="#00D4FF" fill="rgba(0,212,255,.18)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {projection?.recommendations.map((item: string) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </Page>
  );
}

function Reports() {
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  React.useEffect(() => {
    fetch(`${API_URL}/incidents`).then((r) => r.json()).then(setIncidents);
  }, []);
  return (
    <Page>
      <Header eyebrow="Railway Black Box" title="Auto-generated investigation reports" detail="Incident details, sensor timeline, AI reasoning, actions taken, and affected trains packaged into PDFs." />
      <div className="grid gap-4">
        {incidents.slice(0, 18).map((incident) => (
          <Panel key={incident.id} title={`${incident.incident_type} at ${incident.location}`} icon={FileText}>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <p className="text-sm leading-6 text-slate-300">{incident.reasoning.split("\n").slice(0, 3).join(" ")}</p>
              <a className="primary-button" href={`${API_URL}/reports/${incident.id}/pdf`}>
                <Download size={18} /> Download PDF
              </a>
            </div>
          </Panel>
        ))}
      </div>
    </Page>
  );
}

function Header({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <header className="mb-6">
      <p className="text-sm uppercase tracking-[0.26em] text-cyan">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold md:text-5xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-slate-300">{detail}</p>
    </header>
  );
}

function Panel({ title, icon: Icon, className = "", children }: { title: string; icon: any; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-glow backdrop-blur-xl ${className}`}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Icon size={18} className="text-cyan" /> {title}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${danger ? "text-danger" : "text-cyan"}`}>{value}</p>
    </div>
  );
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return <p className="rounded-lg border border-ok/20 bg-ok/10 p-4 text-sm text-ok">All corridors nominal.</p>;
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-lg border border-danger/30 bg-danger/10 p-3">
          <p className="font-semibold text-danger">{alert.type}</p>
          <p className="text-sm text-slate-300">{alert.location} - {alert.action}</p>
        </div>
      ))}
    </div>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[130px_1fr_180px] md:items-center">
      <p className="text-sm text-cyan">#{incident.id} {incident.severity}</p>
      <div>
        <p className="font-semibold">{incident.incident_type} - {incident.location}</p>
        <p className="mt-1 text-sm text-slate-400">{incident.cause}</p>
      </div>
      <p className="text-sm text-slate-400">{new Date(incident.timestamp).toLocaleString()}</p>
    </div>
  );
}

function MiniPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={85} fill="#00D4FF" label />
          <Tooltip contentStyle={{ background: "#08121A", border: "1px solid rgba(0,212,255,.2)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Bars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" />
          <XAxis dataKey="name" stroke="#94A3B8" />
          <YAxis stroke="#94A3B8" />
          <Tooltip contentStyle={{ background: "#08121A", border: "1px solid rgba(0,212,255,.2)" }} />
          <Bar dataKey="value" fill="#00D4FF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function defaultSteps(alerts: Alert[]): AgentStep[] {
  const alert = alerts[0];
  return [
    { stage: "DETECT", summary: alert ? `${alert.type} detected near ${alert.location}.` : "Continuous sensor sweep across all active corridors.", timestamp: "" },
    { stage: "REASON", summary: "Correlating sensor streams with incident memory and weather risk.", timestamp: "" },
    { stage: "DECIDE", summary: alert ? `Severity classified as ${alert.severity}.` : "No intervention needed.", timestamp: "" },
    { stage: "ACT", summary: alert ? alert.action : "Maintain autonomous monitoring.", timestamp: "" },
    { stage: "REPORT", summary: "Black-box report generation remains armed for the next incident.", timestamp: "" },
  ];
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
