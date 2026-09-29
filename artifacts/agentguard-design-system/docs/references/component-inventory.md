# AgentGuard component inventory

This is a source-backed inventory extracted from the reusable visual primitives
defined in `artifacts/agentguard/src/App.tsx`. The source app has a broad
scaffolded UI directory, but its distinctive product language is carried by the
five primitives below.

| Family | Reference | Source evidence | Chunk | Status |
| --- | --- | --- | --- | --- |
| Panel | `components/panel.md` | `App.tsx` `Panel` | 1 | implemented |
| Status badge | `components/status-badge.md` | `App.tsx` `Badge` and `toneForStatus` | 1 | implemented |
| Metric card | `components/metric-card.md` | `App.tsx` `MetricCard` | 1 | implemented |
| Page header | `components/page-header.md` | `App.tsx` `PageHeader` | 1 | implemented |
| Trace block | `components/trace-block.md` | `App.tsx` `TraceBlock` and `TraceList` | 1 | implemented |

These are the first-pass pilot families. The rest of the source app is
application composition rather than a portable component family.