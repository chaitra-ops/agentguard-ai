# Trace block

- **Source:** `artifacts/agentguard/src/App.tsx`, `TraceBlock` and `TraceList`
- **Role:** Evidence container inside an execution trace.
- **Visual contract:** bordered rounded block with mono label and icon. The
  supervisor block may use a translucent teal surface to distinguish reviewed
  evidence from raw worker output.
- **States:** neutral evidence, accented supervisor evidence, list with items,
  and empty list.