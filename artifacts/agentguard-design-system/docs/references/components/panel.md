# Panel

- **Source:** `artifacts/agentguard/src/App.tsx`, `Panel`
- **Role:** Primary section surface for dashboard, monitor, memory, and run
  views.
- **Visual contract:** warm card surface, subtle border, generous padding, and
  rounded 2xl corners. Optional eyebrow, title, and right-aligned action form a
  compact header.
- **States:** default and optional action; hover behavior belongs to the
  interactive child, not the panel shell.