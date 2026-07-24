# Project Structure Reference

A map of the SDD + Claude Code setup in this project: what lives where, and why.

---

## `.claude/` — Claude Code project configuration

### `.claude/agents/`
Subagent definitions. Each `.md` file here becomes a subagent Claude Code can
launch via the Task tool, running in its **own isolated context window** and
returning a summary rather than dumping its full working-out into your main
conversation.

| File | Role |
|---|---|
| `sdd-init.md` | Detects project context, bootstraps `specs/` |
| `sdd-explore.md` | Investigates the codebase before a change is proposed |
| `sdd-propose.md` | Writes the change proposal (intent, scope, approach) |
| `sdd-spec.md` | Writes requirements + Given/When/Then scenarios |
| `sdd-design.md` | Technical design and architecture decisions |
| `sdd-tasks.md` | Breaks the design into a checklist |
| `sdd-apply.md` | Implements tasks, writes real code |
| `sdd-docs.md` | Ensures documentation matches what changed |
| `sdd-verify.md` | Quality gate — runs tests/build, checks spec compliance |
| `sdd-archive.md` | Moves a completed, verified change to `specs/archive/` |

Claude Code auto-discovers everything in this folder — no manual registration.

### `.claude/skills/`
Knowledge Claude loads **automatically** when it judges a skill's description
relevant to the current task — no explicit invocation needed.

- **`skill-registry/SKILL.md`** — builds a cheap index of installed skills so
  subagents don't re-scan `.claude/skills/` from scratch every time.
- **`_shared/`** — not a skill itself (no `SKILL.md`), just reference files the
  agents in `.claude/agents/` point to, so shared rules aren't repeated in
  every phase file:
  - `sdd-phase-common.md` — skill-loading, persistence, role discipline, and
    the shared "return envelope" format every phase uses to report back.
  - `persistence-convention.md` — the file-based convention for `specs/`
    (which phase owns which file, how tasks are checked off, etc).

### `.claude/commands/`
Slash commands — things **you** trigger explicitly by typing `/name`.

- **`sdd.md`** → `/sdd` — the orchestrator. Reads `specs/{change-name}/` to
  figure out which phase comes next, delegates to the matching subagent, and
  reports back. Coordinates the pipeline; does none of the phase work itself.

### `.claude/settings.local.json`
Your personal, git-ignored settings — saved permission approvals ("don't ask
again") and any personal overrides. Not shared with teammates.

---

## `specs/` — SDD artifacts (created by `sdd-init`)

```
specs/
├── {change-name}/
│   ├── proposal.md        ← written by sdd-propose
│   ├── spec.md              ← written by sdd-spec
│   ├── design.md             ← written by sdd-design
│   ├── tasks.md               ← written by sdd-tasks, checked off by sdd-apply
│   ├── docs-report.md          ← written by sdd-docs
│   └── verify-report.md         ← written by sdd-verify
└── archive/
    └── {change-name}/            ← moved here by sdd-archive once shipped
```

Each `{change-name}` folder is one tracked change, moving left-to-right
through the files above as the pipeline progresses. Everything is plain
markdown — readable in any editor, diffable in git, no special tooling
required to inspect.

---

## Root-level files

### `AGENTS.md`
Tool-agnostic project facts: package manager, test/build commands,
non-obvious gotchas. Read natively by Codex and other AGENTS.md-aware tools
(Cursor, Windsurf, Cline, etc).

### `CLAUDE.md`
Claude Code-specific instructions. Starts with `@AGENTS.md` to import the
shared facts above (so nothing is duplicated), followed by anything that's
genuinely Claude-only — e.g. a Next.js version warning, or a skills-loading
table if you're using one.

### `worktrees/`
Not Claude-specific — plain git worktrees, separate checkouts of different
branches. Useful for running multiple subagents/sessions in parallel without
them colliding on the same working directory.

---

## Quick mental model

- **Want Claude to just know something automatically while working?** → skill
- **Want to trigger something yourself, on demand?** → command
- **Want substantial, self-contained work that shouldn't clutter the main
  conversation?** → agent
- **Want to track a specific artifact for a specific change over time?** →
  a file under `specs/{change-name}/`