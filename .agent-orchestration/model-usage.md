# Model usage

The workstream was executed directly in the main orchestrator session (no subagent spawns) because
the task is privacy- and safety-critical and requires every claim to be matched against the actual
code; a single coherent pass produced higher fidelity than fanning out.

- Primary model: main session model (orchestrator).
- TalTech Qwen3.8 27B: not used (no subagent sessions were started).
- Alternate models: none.
- Fallback events: none.

If the TalTech model becomes available for later slices (design polish, Estonian legal translation,
independent security review), the ledger should be updated to record which task each session ran.
