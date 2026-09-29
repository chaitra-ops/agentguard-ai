import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  Gauge,
  Inbox,
  Loader2,
  Menu,
  MessageSquareText,
  Network,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useRoute } from 'wouter';
import {
  getGetActivityQueryKey,
  getGetAlertsQueryKey,
  getGetDashboardMetricsQueryKey,
  getGetMemoriesQueryKey,
  getGetMemoryQueryKey,
  getGetPoliciesQueryKey,
  getGetSettingsQueryKey,
  useGetActivity,
  useGetAlerts,
  useGetDashboardMetrics,
  useGetMemories,
  useGetMemory,
  useGetPolicies,
  useGetSettings,
  useRunAgent,
  useRunEvaluation,
  useSaveFeedback,
  useUpdateSettings,
  type ActivityItem,
  type AgentRun,
  type Alert,
  type DashboardMetrics,
  type EvaluationResult,
  type Memory,
  type Policy,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const navSections = [
  {
    label: 'Control room',
    items: [
      { href: '/', label: 'Overview', icon: Gauge },
      { href: '/run', label: 'Run agent', icon: Play },
      { href: '/monitor', label: 'Live monitor', icon: Activity },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/memory', label: 'Memory', icon: BrainCircuit },
      { href: '/alerts', label: 'Supervisor alerts', icon: AlertTriangle },
      { href: '/learning', label: 'Learning effect', icon: Sparkles },
      { href: '/evaluation', label: 'Evaluation', icon: Target },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings2 }],
  },
];

const formatTime = (timestamp?: string) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const delta = Math.max(0, Date.now() - date.getTime());
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const titleForPath = (path: string) => {
  if (path === '/') return 'Operations overview';
  return navSections.flatMap((section) => section.items).find((item) => item.href === path)?.label ?? 'AgentGuard';
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function LoadingRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-3">{Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>;
}

function EmptyState({ icon: Icon = Inbox, title, detail, action }: { icon?: typeof Inbox; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon size={18} /></div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'safe' | 'review' | 'risk' | 'teal' }) {
  const tones = {
    neutral: 'border-border bg-muted text-muted-foreground',
    safe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    review: 'border-amber-200 bg-amber-50 text-amber-800',
    risk: 'border-red-200 bg-red-50 text-red-700',
    teal: 'border-teal-200 bg-teal-50 text-teal-700',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]', tones[tone])}>{children}</span>;
}

function toneForStatus(status = ''): 'safe' | 'review' | 'risk' | 'teal' | 'neutral' {
  const normalized = status.toLowerCase();
  if (normalized.includes('safe') || normalized.includes('approved') || normalized.includes('prevent')) return 'safe';
  if (normalized.includes('review') || normalized.includes('correct')) return 'review';
  if (normalized.includes('risk') || normalized.includes('fail') || normalized.includes('block')) return 'risk';
  if (normalized.includes('match') || normalized.includes('remember')) return 'teal';
  return 'neutral';
}

function Panel({ children, className = '', title, eyebrow, action }: { children: ReactNode; className?: string; title?: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-card-border bg-card p-5 shadow-[0_10px_24px_rgba(31,45,61,.035)]', className)}>
      {(title || eyebrow || action) && <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">{eyebrow}</p> : null}
          {title ? <h2 className="text-[15px] font-bold tracking-tight text-foreground">{title}</h2> : null}
        </div>
        {action}
      </div>}
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'dark', loading }: { label: string; value?: number; detail: string; icon: typeof Gauge; tone?: 'dark' | 'amber' | 'teal' | 'red'; loading?: boolean }) {
  const accents = { dark: 'bg-primary text-primary-foreground', amber: 'bg-secondary text-secondary-foreground', teal: 'bg-accent text-accent-foreground', red: 'bg-red-100 text-red-700' };
  return (
    <div className="group rounded-2xl border border-card-border bg-card p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[140px] text-xs font-semibold leading-5 text-muted-foreground">{label}</p>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105', accents[tone])}><Icon size={15} /></div>
      </div>
      {loading ? <Skeleton className="mt-5 h-9 w-20" /> : <p className="mt-5 font-mono text-3xl font-medium tracking-[-0.06em] text-foreground">{value?.toLocaleString() ?? '—'}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground md:text-[38px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[254px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[82px] items-center border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-[4px_4px_0_hsl(var(--accent))]"><ShieldCheck size={20} strokeWidth={2.5} /></span>
            <span><span className="block text-[17px] font-extrabold tracking-[-0.04em]">AgentGuard</span><span className="font-mono text-[9px] uppercase tracking-[0.17em] text-sidebar-foreground/55">support control</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="pulse-dot h-2 w-2 rounded-full bg-secondary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/60">System operational</span>
        </div>
        <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-6">
          {navSections.map((section) => <div key={section.label}>
            <p className="mb-2 px-3 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/38">{section.label}</p>
            <div className="space-y-1">{section.items.map((item) => {
              const active = location === item.href;
              return <Link href={item.href} key={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={cn('group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors', active ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground')}>
                <span className="flex items-center gap-3"><item.icon size={16} className={cn(active ? 'text-secondary' : 'text-sidebar-foreground/45 group-hover:text-secondary')} />{item.label}</span>
                {active ? <ChevronRight size={14} className="text-secondary" /> : null}
              </Link>;
            })}</div>
          </div>)}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-sidebar-foreground/48">Runtime</span><Badge tone="safe">online</Badge></div>
            <p className="text-xs font-medium">Production supervision</p>
            <p className="mt-1 text-[10px] leading-4 text-sidebar-foreground/45">Worker + supervisor loop active</p>
          </div>
        </div>
      </aside>
      {mobileOpen ? <button aria-label="Close navigation" data-testid="button-close-navigation" className="fixed inset-0 z-30 bg-primary/40 md:hidden" onClick={() => setMobileOpen(false)} /> : null}
      <main className="min-h-[100dvh] md:pl-[254px]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-muted md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-navigation"><Menu size={19} /></button><span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:block">/ {titleForPath(location)}</span></div>
          <div className="flex items-center gap-3"><span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Live data</span><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-medium text-primary-foreground">OP</div></div>
        </header>
        <div className="mx-auto max-w-[1440px] p-5 md:p-9">{children}</div>
      </main>
    </div>
  );
}

function DashboardPage() {
  const metricsQuery = useGetDashboardMetrics({ query: { queryKey: getGetDashboardMetricsQueryKey() } });
  const activityQuery = useGetActivity({ query: { queryKey: getGetActivityQueryKey() } });
  const policiesQuery = useGetPolicies({ query: { queryKey: getGetPoliciesQueryKey() } });
  const alertsQuery = useGetAlerts({ query: { queryKey: getGetAlertsQueryKey() } });
  const metrics = metricsQuery.data as DashboardMetrics | undefined;
  const activity = (activityQuery.data ?? []) as ActivityItem[];
  const alerts = (alertsQuery.data ?? []) as Alert[];
  const policies = (policiesQuery.data ?? []) as Policy[];
  return <div className="enter-up">
    <PageHeader eyebrow="Control room / 09:42 UTC" title="Know what the agent knows." detail="A clear read on every support interaction, the guardrails around it, and what your team has taught the system." action={<Link href="/run" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-run-agent"><Play size={14} fill="currentColor" />Run an interaction</Link>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total interactions" value={metrics?.totalInteractions} detail="All supervised runs" icon={Activity} loading={metricsQuery.isLoading} />
      <MetricCard label="Safe responses" value={metrics?.safeResponses} detail="Cleared without review" icon={ShieldCheck} tone="teal" loading={metricsQuery.isLoading} />
      <MetricCard label="Review required" value={metrics?.reviewRequired} detail="Held for an operator" icon={AlertTriangle} tone="amber" loading={metricsQuery.isLoading} />
      <MetricCard label="Mistakes prevented" value={metrics?.repeatedMistakesPrevented} detail="By remembered corrections" icon={Zap} tone="red" loading={metricsQuery.isLoading} />
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="Recent activity" eyebrow="Signal feed" action={<Link href="/monitor" className="flex items-center gap-1 text-xs font-bold text-accent hover:underline" data-testid="link-view-monitor">Open monitor <ChevronRight size={14} /></Link>}>
        {activityQuery.isLoading ? <LoadingRows /> : activity.length === 0 ? <EmptyState icon={Activity} title="No activity yet" detail="Live execution events will appear here as the worker starts handling requests." /> : <div className="divide-y divide-border">{activity.slice(0, 7).map((item) => <ActivityRow item={item} key={item.id} />)}</div>}
      </Panel>
      <div className="space-y-5">
        <Panel title="Guardrail posture" eyebrow="Policy layer" action={<Link href="/settings" className="text-muted-foreground hover:text-foreground" data-testid="link-policy-settings"><SlidersHorizontal size={16} /></Link>}>
          <div className="mb-4 flex items-end justify-between"><div><p className="font-mono text-3xl tracking-[-0.05em]">{policies.length}</p><p className="text-xs text-muted-foreground">active policies loaded</p></div><div className="flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-accent/25 border-t-accent"><ShieldCheck size={18} className="text-accent" /></div></div>
          <div className="space-y-2">{policies.slice(0, 4).map((policy) => <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2" key={policy.id}><span className="truncate text-xs font-semibold">{policy.title}</span><Badge tone={policy.active ? 'safe' : 'neutral'}>{policy.active ? 'active' : 'off'}</Badge></div>)}</div>
          {policies.length === 0 && <p className="text-sm text-muted-foreground">No policy records returned.</p>}
        </Panel>
        <Panel title="Review queue" eyebrow="Supervisor attention">
          {alerts.length === 0 ? <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3"><CheckCircle2 size={18} className="text-accent" /><p className="text-xs text-muted-foreground">No supervisor alerts waiting.</p></div> : <div className="flex items-center justify-between"><div><p className="font-mono text-3xl tracking-[-0.05em]">{alerts.filter((a) => a.status.toLowerCase().includes('review')).length}</p><p className="text-xs text-muted-foreground">alerts require a look</p></div><Link href="/alerts" className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground" data-testid="link-open-alerts"><ArrowUpRight size={16} /></Link></div>}
        </Panel>
      </div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MiniStat label="Supervisor reviews" value={metrics?.supervisorReviews} loading={metricsQuery.isLoading} />
      <MiniStat label="Failure detections" value={metrics?.previousFailureDetections} loading={metricsQuery.isLoading} />
      <MiniStat label="Human corrections" value={metrics?.humanCorrections} loading={metricsQuery.isLoading} />
      <MiniStat label="Memories stored" value={metrics?.memoriesStored} loading={metricsQuery.isLoading} />
    </div>
  </div>;
}

function MiniStat({ label, value, loading }: { label: string; value?: number; loading?: boolean }) {
  return <div className="rounded-xl border border-card-border bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">{label}</p>{loading ? <Skeleton className="mt-2 h-6 w-14" /> : <p className="mt-1 font-mono text-xl">{value?.toLocaleString() ?? '—'}</p>}</div>;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return <div className="flex items-start gap-3 py-3.5"><div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', toneForStatus(item.type) === 'risk' ? 'bg-red-100 text-red-700' : toneForStatus(item.type) === 'review' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700')}><CircleDot size={13} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatTime(item.timestamp)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p></div></div>;
}

function RunPage() {
  const [request, setRequest] = useState('');
  const [run, setRun] = useState<AgentRun | undefined>();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [decision, setDecision] = useState('approved');
  const [correction, setCorrection] = useState('');
  const runMutation = useRunAgent();
  const feedbackMutation = useSaveFeedback();
  const canSubmit = request.trim().length > 0 && !runMutation.isPending;
  const submit = () => {
    if (!canSubmit) return;
    runMutation.mutate({ data: { request: request.trim() } }, { onSuccess: (result) => { setRun(result); setFeedbackOpen(false); } });
  };
  const saveFeedback = () => {
    if (!run) return;
    feedbackMutation.mutate({ data: { interactionId: run.id, decision, whatWasWrong: decision === 'corrected' ? correction : undefined } }, { onSuccess: () => { setFeedbackOpen(false); setCorrection(''); } });
  };
  return <div className="enter-up">
    <PageHeader eyebrow="Execution / worker + supervisor" title="Run the support agent." detail="Submit the exact customer request you want to inspect. AgentGuard exposes the worker response, policy checks, memory retrieval, and final decision in one trace." />
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,.72fr)_minmax(500px,1.28fr)]">
      <Panel className="h-fit" title="New interaction" eyebrow="Input">
        <label htmlFor="agent-request" className="mb-2 block text-xs font-bold">Customer request</label>
        <textarea id="agent-request" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Example: I was charged twice for the same order. Can you reverse one charge?" className="min-h-44 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/15" data-testid="textarea-agent-request" />
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span className="font-mono">{request.length} characters</span><span>Worker runs with current settings</span></div>
        <button onClick={submit} disabled={!canSubmit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-agent">{runMutation.isPending ? <><Loader2 size={15} className="animate-spin" />Tracing response</> : <><Play size={15} fill="currentColor" />Run support agent</>}</button>
        {runMutation.isError ? <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><XCircle size={15} className="mt-0.5 shrink-0" /><span>Execution failed. Try the request again.</span></div> : null}
        <div className="mt-5 border-t border-border pt-4"><p className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Trace stages</p><div className="space-y-2">{['Worker response', 'Policy evaluation', 'Memory retrieval', 'Supervisor decision', 'Final response'].map((stage, index) => <div className="flex items-center gap-2 text-xs text-muted-foreground" key={stage}><span className={cn('flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px]', run ? 'bg-teal-100 text-teal-700' : 'bg-muted text-muted-foreground')}>{run ? <Check size={11} /> : index + 1}</span>{stage}</div>)}</div></div>
      </Panel>
      <RunResult run={run} feedbackOpen={feedbackOpen} setFeedbackOpen={setFeedbackOpen} decision={decision} setDecision={setDecision} correction={correction} setCorrection={setCorrection} onFeedback={saveFeedback} feedbackPending={feedbackMutation.isPending} />
    </div>
  </div>;
}

function RunResult({ run, feedbackOpen, setFeedbackOpen, decision, setDecision, correction, setCorrection, onFeedback, feedbackPending }: { run?: AgentRun; feedbackOpen: boolean; setFeedbackOpen: (open: boolean) => void; decision: string; setDecision: (value: string) => void; correction: string; setCorrection: (value: string) => void; onFeedback: () => void; feedbackPending: boolean }) {
  if (!run) return <Panel className="grid-scan flex min-h-[560px] items-center justify-center overflow-hidden"><div className="max-w-sm text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-secondary shadow-[7px_7px_0_hsl(var(--accent))]"><Network size={28} /></div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Awaiting trace</p><h2 className="mt-3 text-2xl font-extrabold tracking-tight">The control room is ready.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A completed run will reveal every layer of the support decision here.</p></div></Panel>;
  const supervisorTone = toneForStatus(run.supervisor.riskLevel || run.supervisor.status);
  return <div className="space-y-5">
    <Panel title="Execution trace" eyebrow={`Run ${run.id}`} action={<Badge tone={supervisorTone}>{run.supervisor.status || run.supervisor.riskLevel}</Badge>}>
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><TraceMetric label="Category" value={run.category} /><TraceMetric label="Mode" value={run.mode} /><TraceMetric label="Completed" value={formatTime(run.timestamp)} /></div>
      <TraceBlock label="Worker response" icon={MessageSquareText}><p className="text-sm leading-6 text-foreground">{run.workerResponse}</p></TraceBlock>
      <TraceBlock label="Supervisor reasoning" icon={ShieldCheck} accent><div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]"><div><p className="text-sm leading-6">{run.supervisor.reason}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone={supervisorTone}>{run.supervisor.riskLevel} risk</Badge><Badge tone="neutral">{Math.round(run.supervisor.confidence * 100)}% confidence</Badge></div></div><div className="rounded-lg bg-muted/70 p-3"><p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Recommended action</p><p className="text-xs font-semibold leading-5">{run.supervisor.recommendedAction}</p></div></div></TraceBlock>
      <div className="grid gap-3 md:grid-cols-2"><TraceList label="Policy issues" items={run.supervisor.policyIssues} empty="No policy issues found." tone="risk" /><TraceList label="Memory matches" items={run.supervisor.memoryMatches} empty="No related memories retrieved." tone="teal" /></div>
      <TraceBlock label="Final response" icon={CheckCircle2}><p className="text-sm leading-6">{run.finalResponse}</p></TraceBlock>
    </Panel>
    <Panel title="Human feedback" eyebrow="Durable correction" action={<button onClick={() => setFeedbackOpen(!feedbackOpen)} className="rounded-lg border border-input px-3 py-2 text-xs font-bold hover:bg-muted" data-testid="button-toggle-feedback">{feedbackOpen ? 'Close' : 'Review response'}</button>}>
      {feedbackOpen ? <div className="space-y-4"><div className="flex flex-wrap gap-2"><button onClick={() => setDecision('approved')} className={cn('rounded-lg border px-3 py-2 text-xs font-bold', decision === 'approved' ? 'border-accent bg-teal-50 text-teal-700' : 'border-input')} data-testid="button-feedback-approved"><Check size={13} className="mr-1 inline" />Approve</button><button onClick={() => setDecision('corrected')} className={cn('rounded-lg border px-3 py-2 text-xs font-bold', decision === 'corrected' ? 'border-secondary bg-amber-50 text-amber-800' : 'border-input')} data-testid="button-feedback-corrected"><ArrowDownRight size={13} className="mr-1 inline" />Correct</button></div>{decision === 'corrected' ? <textarea value={correction} onChange={(event) => setCorrection(event.target.value)} placeholder="What should the agent remember next time?" className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-accent" data-testid="textarea-feedback-correction" /> : null}<button onClick={onFeedback} disabled={feedbackPending || (decision === 'corrected' && !correction.trim())} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-45" data-testid="button-save-feedback">{feedbackPending ? 'Saving correction…' : 'Save feedback'}</button></div> : <div className="flex items-center gap-3 text-sm text-muted-foreground"><BrainCircuit size={17} className="text-accent" /><span>Confirm or correct this response to make the learning loop durable.</span></div>}
    </Panel>
  </div>;
}

function TraceMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/55 px-3 py-2.5"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-bold">{value || '—'}</p></div>; }
function TraceBlock({ label, icon: Icon, children, accent = false }: { label: string; icon: typeof ShieldCheck; children: ReactNode; accent?: boolean }) { return <div className={cn('mb-3 rounded-xl border p-4', accent ? 'border-accent/30 bg-teal-50/45' : 'border-border bg-background/45')}><div className="mb-3 flex items-center gap-2"><Icon size={14} className={accent ? 'text-accent' : 'text-muted-foreground'} /><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p></div>{children}</div>; }
function TraceList({ label, items, empty, tone }: { label: string; items: string[]; empty: string; tone: 'risk' | 'teal' }) { return <div className="rounded-xl border border-border p-4"><p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>{items.length ? <div className="space-y-2">{items.map((item, index) => <div key={`${item}-${index}`} className="flex gap-2 text-xs leading-5"><span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', tone === 'risk' ? 'bg-red-500' : 'bg-accent')} />{item}</div>)}</div> : <p className="text-xs text-muted-foreground">{empty}</p>}</div>; }

function MonitorPage() {
  const activityQuery = useGetActivity({ query: { queryKey: getGetActivityQueryKey() } });
  const alertsQuery = useGetAlerts({ query: { queryKey: getGetAlertsQueryKey() } });
  const activity = (activityQuery.data ?? []) as ActivityItem[];
  const alerts = (alertsQuery.data ?? []) as Alert[];
  return <div className="enter-up"><PageHeader eyebrow="Control room / live stream" title="Live monitor." detail="Watch the supervision loop as it moves through worker, policy, memory, and human review stages." action={<div className="flex items-center gap-2 rounded-lg border border-accent/25 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />Streaming activity</div>} /><div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Panel title="Execution activity" eyebrow="Newest first" action={<button onClick={() => activityQuery.refetch()} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-refresh-activity"><RefreshCw size={15} className={activityQuery.isFetching ? 'animate-spin' : ''} /></button>}>{activityQuery.isLoading ? <LoadingRows count={6} /> : activity.length ? <div className="divide-y divide-border">{activity.map((item) => <ActivityRow item={item} key={item.id} />)}</div> : <EmptyState icon={Activity} title="Waiting for activity" detail="New supervised runs will appear in this stream." />}</Panel><Panel title="Stage state" eyebrow="Loop health"><div className="space-y-2">{['Worker', 'Policy checks', 'Memory retrieval', 'Supervisor', 'Human handoff'].map((stage, index) => <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3" key={stage}><div className={cn('h-2 w-2 rounded-full', index < 4 ? 'bg-accent pulse-dot' : 'bg-secondary')} /><div className="flex-1"><p className="text-xs font-bold">{stage}</p><p className="text-[10px] text-muted-foreground">{index < 4 ? 'available' : 'standby'}</p></div><span className="font-mono text-[10px] text-muted-foreground">{index < 4 ? 'ready' : 'idle'}</span></div>)}</div><div className="mt-5 border-t border-border pt-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Alerts in window</span><span className="font-mono">{alerts.length}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-accent" /></div></div></Panel></div></div>;
}

function MemoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [sort, setSort] = useState('recent');
  const [selectedId, setSelectedId] = useState('');
  const params = useMemo(() => ({ search: search || undefined, category: category || undefined, severity: severity || undefined, sort: sort || undefined }), [search, category, severity, sort]);
  const memoriesQuery = useGetMemories(params, { query: { queryKey: getGetMemoriesQueryKey(params) } });
  const detailQuery = useGetMemory(selectedId, { query: { enabled: Boolean(selectedId), queryKey: getGetMemoryQueryKey(selectedId) } });
  const memories = (memoriesQuery.data ?? []) as Memory[];
  const categories = Array.from(new Set(memories.map((memory) => memory.category).filter(Boolean)));
  return <div className="enter-up"><PageHeader eyebrow="Intelligence / remembered experience" title="Memory explorer." detail="Search the corrections and failures AgentGuard can retrieve before a response is sent." /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div><Panel className="mb-5" title="Find a memory" eyebrow="Retrieval index"><div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"><div className="relative"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request, correction, or situation" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-accent" data-testid="input-memory-search" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-accent" data-testid="select-memory-category"><option value="">All categories</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select><select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-accent" data-testid="select-memory-severity"><option value="">All severity</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-accent" data-testid="select-memory-sort"><option value="recent">Recent</option><option value="retrievals">Most retrieved</option></select></div></Panel>{memoriesQuery.isLoading ? <LoadingRows count={5} /> : memories.length ? <div className="space-y-3">{memories.map((memory) => <button key={memory.id} onClick={() => setSelectedId(memory.id)} className={cn('w-full rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50', selectedId === memory.id ? 'border-accent ring-2 ring-accent/10' : 'border-card-border')} data-testid={`button-memory-${memory.id}`}><div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge tone={toneForStatus(memory.severity)}>{memory.severity || 'unrated'}</Badge><Badge tone="neutral">{memory.category || 'general'}</Badge></div><span className="font-mono text-[10px] text-muted-foreground">{formatTime(memory.timestamp)}</span></div><p className="mt-3 text-sm font-bold leading-5">{memory.situation}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{memory.humanCorrection || memory.correctAction || memory.failure}</p><div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10px] text-muted-foreground"><span>{memory.domain}</span><span className="font-mono">{memory.retrievalCount} retrievals <ChevronRight size={12} className="ml-1 inline" /></span></div></button>)}</div> : <EmptyState icon={BrainCircuit} title="No memories match" detail="Try a broader search or clear one of the filters." action={<button onClick={() => { setSearch(''); setCategory(''); setSeverity(''); }} className="text-xs font-bold text-accent hover:underline" data-testid="button-clear-memory-filters">Clear filters</button>} />}</div><MemoryDetail memory={detailQuery.data as Memory | undefined} loading={detailQuery.isLoading} /></div></div>;
}

function MemoryDetail({ memory, loading }: { memory?: Memory; loading: boolean }) {
  return <Panel className="h-fit xl:sticky xl:top-[94px]" title="Memory detail" eyebrow={memory ? `Record ${memory.id}` : 'Select a record'}>{loading ? <LoadingRows count={6} /> : !memory ? <div className="py-14 text-center"><BrainCircuit size={24} className="mx-auto text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">Choose a memory</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The full correction trail will open here.</p></div> : <div className="space-y-4"><div className="flex flex-wrap gap-2"><Badge tone={toneForStatus(memory.severity)}>{memory.severity}</Badge><Badge tone="teal">{memory.retrievalCount} retrievals</Badge></div><DetailField label="Situation" value={memory.situation} /><DetailField label="Customer request" value={memory.customerRequest} /><DetailField label="Agent response" value={memory.agentResponse} /><DetailField label="What failed" value={memory.failure} /><DetailField label="Human correction" value={memory.humanCorrection} highlight /><DetailField label="Correct action" value={memory.correctAction} highlight /></div>}</Panel>;
}
function DetailField({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) { return <div className={cn('rounded-lg p-3', highlight ? 'bg-amber-50' : 'bg-muted/55')}><p className="mb-1 font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className="text-xs leading-5">{value || 'Not recorded'}</p></div>; }

function AlertsPage() {
  const alertsQuery = useGetAlerts({ query: { queryKey: getGetAlertsQueryKey() } });
  const alerts = (alertsQuery.data ?? []) as Alert[];
  const groups = [
    { label: 'SAFE', description: 'Supervisor cleared the response', tone: 'safe' as const, items: alerts.filter((alert) => toneForStatus(alert.status) === 'safe') },
    { label: 'REVIEW REQUIRED', description: 'An operator should decide next', tone: 'review' as const, items: alerts.filter((alert) => toneForStatus(alert.status) === 'review') },
    { label: 'PREVIOUS FAILURE DETECTED', description: 'A remembered failure changed the path', tone: 'risk' as const, items: alerts.filter((alert) => toneForStatus(alert.riskLevel) === 'risk' || alert.reason.toLowerCase().includes('previous')) },
  ];
  return <div className="enter-up"><PageHeader eyebrow="Intelligence / supervisor" title="Supervisor alerts." detail="Every alert carries the request, the worker's proposed response, and the reason the loop chose its final outcome." action={<button onClick={() => alertsQuery.refetch()} className="flex items-center gap-2 rounded-lg border border-input px-3 py-2.5 text-xs font-bold hover:bg-muted" data-testid="button-refresh-alerts"><RefreshCw size={14} className={alertsQuery.isFetching ? 'animate-spin' : ''} />Refresh feed</button>} />{alertsQuery.isLoading ? <LoadingRows count={4} /> : <div className="grid gap-5 xl:grid-cols-3">{groups.map((group) => <Panel key={group.label} title={group.label} eyebrow={group.description} action={<span className="font-mono text-xs text-muted-foreground">{group.items.length}</span>}>{group.items.length ? <div className="space-y-3">{group.items.map((alert) => <AlertCard alert={alert} key={alert.id} tone={group.tone} />)}</div> : <EmptyState icon={group.tone === 'safe' ? CheckCircle2 : AlertTriangle} title="No alerts here" detail="The feed is clear for this group." />}</Panel>)}</div>}</div>;
}
function AlertCard({ alert, tone }: { alert: Alert; tone: 'safe' | 'review' | 'risk' }) { return <div className="rounded-xl border border-border bg-background/45 p-3 transition-colors hover:border-accent/40"><div className="flex items-center justify-between gap-2"><Badge tone={tone}>{alert.riskLevel || alert.status}</Badge><span className="font-mono text-[10px] text-muted-foreground">{formatTime(alert.timestamp)}</span></div><p className="mt-3 text-xs font-bold leading-5">{alert.customerRequest}</p><p className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted-foreground">{alert.reason}</p><div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px]"><span className="text-muted-foreground">{alert.relatedMemories.length} related memories</span><span className={cn('font-semibold', tone === 'safe' ? 'text-teal-700' : tone === 'risk' ? 'text-red-700' : 'text-amber-800')}>{alert.finalOutcome}</span></div></div>; }

function LearningPage() {
  const metricsQuery = useGetDashboardMetrics({ query: { queryKey: getGetDashboardMetricsQueryKey() } });
  const metrics = metricsQuery.data as DashboardMetrics | undefined;
  const steps = [
    { name: 'Observe', icon: Activity, text: 'The system captures the full worker and supervisor trace.' },
    { name: 'Correct', icon: MessageSquareText, text: 'A support lead approves or explains what should change.' },
    { name: 'Remember', icon: BrainCircuit, text: 'The correction becomes a structured experience memory.' },
    { name: 'Retrieve', icon: Search, text: 'Similar future requests surface the memory before generation.' },
    { name: 'Prevent', icon: ShieldCheck, text: 'The supervisor blocks a repeat mistake or routes it to review.' },
  ];
  return <div className="enter-up"><PageHeader eyebrow="Intelligence / feedback loop" title="Learning effect." detail="A correction is only valuable when it changes what happens next. AgentGuard tracks that path from operator observation to prevented repeat failure." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Human corrections" value={metrics?.humanCorrections} detail="Operator decisions recorded" icon={MessageSquareText} tone="amber" loading={metricsQuery.isLoading} /><MetricCard label="Memories stored" value={metrics?.memoriesStored} detail="Durable experience records" icon={BrainCircuit} tone="teal" loading={metricsQuery.isLoading} /><MetricCard label="Retrieval wins" value={metrics?.previousFailureDetections} detail="Previous failures detected" icon={Search} tone="dark" loading={metricsQuery.isLoading} /><MetricCard label="Repeat mistakes prevented" value={metrics?.repeatedMistakesPrevented} detail="The loop changed behavior" icon={ShieldCheck} tone="red" loading={metricsQuery.isLoading} /></div><Panel className="mt-5 overflow-hidden" title="The AgentGuard learning loop" eyebrow="Observe → Correct → Remember → Retrieve → Prevent"><div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">{steps.map((step, index) => <div className="bg-card p-5" key={step.name}><div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-secondary"><step.icon size={17} /></div><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span></div><h3 className="mt-5 text-base font-extrabold tracking-tight">{step.name}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>{index < steps.length - 1 ? <div className="mt-6 hidden items-center gap-1 text-accent md:flex"><span className="h-px flex-1 bg-accent/30" /><ArrowUpRight size={13} /></div> : null}</div>)}</div></Panel><div className="mt-5 grid gap-5 md:grid-cols-2"><Panel title="What to look for" eyebrow="Operator lens"><div className="space-y-3"><LearningSignal icon={CheckCircle2} title="Safe by construction" detail="A response is safe because the relevant policy and past correction were visible before the final answer." tone="teal" /><LearningSignal icon={AlertTriangle} title="Review is a feature" detail="Uncertainty is surfaced as an operator decision, not hidden behind confident wording." tone="amber" /><LearningSignal icon={Zap} title="Prevention compounds" detail="The strongest signal is not more feedback. It is fewer repeated mistakes over time." tone="dark" /></div></Panel><Panel title="Loop coverage" eyebrow="Current data"><div className="space-y-4"><ProgressRow label="Interactions supervised" value={metrics?.totalInteractions} max={metrics?.totalInteractions || 1} /><ProgressRow label="Responses safe" value={metrics?.safeResponses} max={metrics?.totalInteractions || 1} /><ProgressRow label="Corrections remembered" value={metrics?.memoriesStored} max={Math.max(metrics?.humanCorrections || 1, 1)} /></div></Panel></div></div>;
}
function LearningSignal({ icon: Icon, title, detail, tone }: { icon: typeof CheckCircle2; title: string; detail: string; tone: 'teal' | 'amber' | 'dark' }) { return <div className="flex gap-3"><div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone === 'teal' ? 'bg-teal-100 text-teal-700' : tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-primary text-secondary')}><Icon size={15} /></div><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></div>; }
function ProgressRow({ label, value = 0, max = 1 }: { label: string; value?: number; max?: number }) { const percent = Math.min(100, Math.round((value / Math.max(max, 1)) * 100)); return <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value.toLocaleString()}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} /></div></div>; }

function EvaluationPage() {
  const [includeMemory, setIncludeMemory] = useState(true);
  const evaluationMutation = useRunEvaluation();
  const result = evaluationMutation.data as EvaluationResult | undefined;
  return <div className="enter-up"><PageHeader eyebrow="Evaluation / seeded support set" title="Measure the guardrails." detail="Run the seeded support scenarios against the current worker, policies, and memory layer. Use the case breakdown to see where supervision changes the outcome." action={<button onClick={() => evaluationMutation.mutate({ data: { includeMemory } })} disabled={evaluationMutation.isPending} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50" data-testid="button-run-evaluation">{evaluationMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}Run evaluation</button>} /><div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"><div><p className="text-xs font-bold">Include memory retrieval</p><p className="mt-1 text-[11px] text-muted-foreground">Evaluate the prevention layer alongside policy checks.</p></div><button role="switch" aria-checked={includeMemory} onClick={() => setIncludeMemory(!includeMemory)} className={cn('relative h-6 w-11 rounded-full transition-colors', includeMemory ? 'bg-accent' : 'bg-muted')} data-testid="button-toggle-evaluation-memory"><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-card transition-transform', includeMemory ? 'left-6' : 'left-1')} /></button></div>{evaluationMutation.isError ? <div className="mb-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><XCircle size={15} />Evaluation could not complete. Try again.</div> : null}{!result ? <Panel className="grid-scan flex min-h-72 items-center justify-center text-center"><div><Target size={30} className="mx-auto text-accent" /><h2 className="mt-4 text-xl font-extrabold">No evaluation run yet</h2><p className="mt-2 text-sm text-muted-foreground">Run the seeded set to populate the scorecard and case-level results.</p></div></Panel> : <EvaluationResultView result={result} />}</div>;
}
function EvaluationResultView({ result }: { result: EvaluationResult }) { const stats = [['Total cases', result.totalCases, 'dark'], ['Safe cases', result.safeCases, 'teal'], ['Review required', result.reviewRequiredCases, 'amber'], ['Previous failures', result.repeatedFailureDetections, 'red']] as const; return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, tone]) => <MetricCard key={label} label={label} value={value} detail="Latest evaluation run" icon={label === 'Total cases' ? Target : label === 'Safe cases' ? CheckCircle2 : label === 'Review required' ? AlertTriangle : Zap} tone={tone} />)}</div><div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Panel title="Case results" eyebrow={`Run ${result.id}`}><div className="mb-4 flex gap-4 text-[11px] text-muted-foreground"><span>{result.policyIssues} policy issues</span><span>{result.memoryMatches} memory matches</span><span>{result.humanCorrections} corrections</span></div>{result.cases.length ? <div className="divide-y divide-border">{result.cases.map((item, index) => <div className="flex items-start gap-3 py-3" key={`${item.request}-${index}`}><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold">{item.request}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.category}</p></div><Badge tone={toneForStatus(item.status)}>{item.status || item.riskLevel}</Badge></div>)}</div> : <EmptyState icon={Target} title="No cases returned" detail="The evaluation completed without case-level records." />}</Panel><Panel title="Run summary" eyebrow="Supervision outcomes"><div className="space-y-4"><ProgressRow label="Safe rate" value={result.safeCases} max={result.totalCases} /><ProgressRow label="Review rate" value={result.reviewRequiredCases} max={result.totalCases} /><ProgressRow label="Policy issues" value={result.policyIssues} max={Math.max(result.totalCases, 1)} /><div className="border-t border-border pt-4"><p className="text-xs text-muted-foreground">Completed {formatTime(result.timestamp)}</p></div></div></Panel></div></>; }

function SettingsPage() {
  const settingsQuery = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateMutation = useUpdateSettings();
  const queryClient = useQueryClient();
  const settings = settingsQuery.data;
  const updateMode = (executionMode: string) => updateMutation.mutate({ data: { executionMode } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() }) });
  return <div className="enter-up"><PageHeader eyebrow="System / runtime configuration" title="Settings." detail="Choose how the supervision loop executes, then verify the connections it relies on." />{settingsQuery.isLoading ? <LoadingRows count={3} /> : settings ? <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Panel title="Execution mode" eyebrow="Runtime behavior"><div className="space-y-2">{['supervised', 'worker_only'].map((mode) => <button key={mode} onClick={() => updateMode(mode)} className={cn('flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors', settings.executionMode === mode ? 'border-accent bg-teal-50/50' : 'border-border hover:bg-muted')} data-testid={`button-execution-mode-${mode}`}><div><p className="text-sm font-bold">{mode === 'supervised' ? 'Supervised loop' : 'Worker only'}</p><p className="mt-1 text-xs text-muted-foreground">{mode === 'supervised' ? 'Run policy and memory checks before returning a response.' : 'Return the worker response without the full supervision loop.'}</p></div>{settings.executionMode === mode ? <CheckCircle2 size={18} className="shrink-0 text-accent" /> : <CircleDot size={18} className="shrink-0 text-muted-foreground/40" />}</button>)}</div>{updateMutation.isPending ? <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><Loader2 size={13} className="animate-spin" />Saving runtime preference…</p> : null}{updateMutation.isError ? <p className="mt-4 text-xs text-red-700">The setting could not be updated.</p> : null}</Panel><div className="space-y-5"><Panel title="Memory mode" eyebrow="Retrieval behavior"><div className="flex items-center justify-between rounded-xl bg-muted/60 p-4"><div><p className="text-sm font-bold">{settings.memoryMode || 'Not configured'}</p><p className="mt-1 text-xs text-muted-foreground">Controlled by the runtime integration.</p></div><Database size={20} className="text-accent" /></div></Panel><Panel title="Integration status" eyebrow="Dependencies"><div className="space-y-3"><IntegrationRow label="LLM provider" connected={settings.llmConfigured} /><IntegrationRow label="Hindsight memory" connected={settings.hindsightConfigured} /><IntegrationRow label="Supervisor loop" connected /></div></Panel></div></div> : <EmptyState icon={Settings2} title="Settings unavailable" detail="Runtime settings did not return from the API." />}</div>;
}
function IntegrationRow({ label, connected }: { label: string; connected: boolean }) { return <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"><span className="text-xs font-semibold">{label}</span><Badge tone={connected ? 'safe' : 'risk'}>{connected ? 'connected' : 'not configured'}</Badge></div>; }

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={DashboardPage} /><Route path="/run" component={RunPage} /><Route path="/monitor" component={MonitorPage} /><Route path="/memory" component={MemoryPage} /><Route path="/alerts" component={AlertsPage} /><Route path="/learning" component={LearningPage} /><Route path="/evaluation" component={EvaluationPage} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><Router /></QueryClientProvider>;
}

export default App;