# How This Project Uses AI Agents

This project uses Spec-Driven Development (SDD) with Claude Code subagents
instead of asking an AI to write code straight from a chat prompt. This doc
explains why, what the pieces are, and walks through a real example.

---

## Why SDD instead of just prompting?

Prompting works fine for small, obvious changes. It breaks down once a
feature touches multiple files, because the *design decision* — not the
typing — is the hard part, and a chat-driven agent tends to make that
decision implicitly, buried inside code you then have to reverse-engineer
to review.

SDD separates the decision from the typing:

1. Write down **what** you're building and **why** (proposal, spec)
2. Write down **how** (design)
3. Break it into small, checkable **steps** (tasks)
4. *Then* implement — one reviewable step at a time

You review the plan before any code exists, which is a much cheaper place
to catch a wrong assumption than a 500-line diff.

---

## The three building blocks

| Block | Triggered by | Runs where | Use for |
|---|---|---|---|
| **Skill** | Claude, automatically, when relevant | Current conversation | Passive conventions — "always match the existing doc style" |
| **Command** | You, explicitly (`/name`) | Current conversation | Actions you decide to kick off |
| **Agent** | The Task tool (by you or an orchestrator) | Isolated context window | Substantial, self-contained work |

In this project: `/sdd` is the **command** you type. It delegates each
phase to an **agent** in `.claude/agents/`. `skill-registry` is the one
**skill**, quietly telling every agent what other conventions exist.

Full breakdown of every file: see `docs/project-structure.md`.

---

## The pipeline

```
sdd-init → sdd-explore → sdd-propose → sdd-spec → sdd-design → sdd-tasks
    → sdd-apply → sdd-docs → sdd-verify → sdd-archive
```

Each arrow is a checkpoint. Nothing auto-cascades to the next phase without
you seeing the previous phase's result first — `/sdd` stops after one phase
by default so you can course-correct early.

---

## How to use it: a worked example

Say you want to add rate-limit headers to an API response.

### 1. Start the pipeline
```
/sdd add-rate-limit-headers
```
`specs/` doesn't exist yet, so the orchestrator delegates to **`sdd-init`**
first. It detects your stack (language, test/build commands) and creates
`specs/`. No code changes.

### 2. Explore (optional but recommended for anything non-trivial)
```
/sdd add-rate-limit-headers explore
```
**`sdd-explore`** reads your existing rate-limiting code, finds it's
implemented in `lib/rate-limit.ts`, and returns:
> "Rate limiting exists but doesn't currently expose remaining-request
> count. `X-RateLimit-*` headers would need to be added at the response
> layer. Open question: which endpoints need this — all, or just the
> rate-limited ones?"

You answer the open question in your next message.

### 3. Propose
```
/sdd add-rate-limit-headers propose
```
**`sdd-propose`** writes `specs/add-rate-limit-headers/proposal.md`:
Intent, scope (which endpoints), approach (add headers in the existing
rate-limit middleware), rollback plan. You read it, and either approve or
ask for a change.

### 4. Spec
**`sdd-spec`** turns the approved proposal into testable requirements:
```
### REQ-01: Rate limit headers on protected endpoints
Given a request to a rate-limited endpoint
When the response is returned
Then it includes X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### 5. Design
**`sdd-design`** decides exactly where in the code this happens, which
files change, and why (e.g. "add to the existing middleware rather than a
new one, to avoid double-wrapping requests").

### 6. Tasks
**`sdd-tasks`** breaks it into a checklist:
```
## Phase 1: Headers
- [ ] 1.1 Add header calculation to lib/rate-limit.ts
- [ ] 1.2 Attach headers in the middleware response
## Phase 2: Tests
- [ ] 2.1 Add test for header presence on limited endpoints
- [ ] 2.2 Add test for header absence on unlimited endpoints
```

### 7. Apply
```
/sdd add-rate-limit-headers apply
```
**`sdd-apply`** implements each task, checking boxes off as it goes —
you can watch progress in `tasks.md` in real time.

### 8. Docs
**`sdd-docs`** checks whether the changed functions have doc comments in
this project's existing style, updates them if stale, and notes in
`docs-report.md` if the README needs a mention of the new headers.

### 9. Verify
**`sdd-verify`** actually runs your test suite, checks the new tests pass,
confirms `docs-report.md` isn't empty, and produces a compliance matrix
mapping each `REQ-0X` to the test that proves it. Verdict: PASS, PASS WITH
WARNINGS, or FAIL.

### 10. Archive
Once verify passes, **`sdd-archive`** moves the whole
`specs/add-rate-limit-headers/` folder to `specs/archive/`, keeping the
paper trail without cluttering active work.

---

## Using it for new features

The worked example above shows what happens *inside* one feature. Here's
the day-to-day pattern for reaching for it repeatedly.

### One-time setup

```
/sdd
```
With no `specs/` folder yet, this delegates to `sdd-init` automatically —
detects your stack, creates `specs/`. You won't need to run this again
unless your test/build setup changes later.

### Single feature, start to finish

```
/sdd add-photo-tagging
```
- No `specs/add-photo-tagging/` folder exists yet → starts at `sdd-propose`
  (or run `sdd-explore` first if you're not sure how the feature should
  work yet — just ask for it explicitly).
- Review `proposal.md`. Happy with it? Run the exact same command again:
  ```
  /sdd add-photo-tagging
  ```
  The orchestrator reads what already exists in that folder and moves to
  the next phase on its own — `proposal.md` exists but `spec.md` doesn't,
  so it runs `sdd-spec` next. You never type which phase comes next.
- Repeat through `spec.md` → `design.md` → `tasks.md`. Push back on any of
  them before moving on — cheaper to fix a plan than a diff.
- Once `tasks.md` looks right, say **"go ahead and implement it"** —
  `sdd-apply` works through the checklist, `sdd-docs` catches up
  documentation, `sdd-verify` runs the real test suite and gives a
  PASS/FAIL verdict.
- Once verify passes, say **"archive it"** — the whole
  `specs/add-photo-tagging/` folder moves to `specs/archive/`.

### Running two features in parallel

Each feature just gets its own change-name folder — `specs/` is keyed by
name, so nothing collides on the artifact side:

```
/sdd add-photo-tagging
/sdd fix-thumbnail-cache-bug
```
```
specs/
├── add-photo-tagging/
│   └── proposal.md
└── fix-thumbnail-cache-bug/
    └── proposal.md
```

That's enough if you're working the two plans one message at a time in the
same session — the orchestrator always operates on whichever change-name
you name in the command.

**If you want to actually *implement* both at the same time** (e.g. two
Claude Code sessions running concurrently), give each one its own git
worktree so they're not editing the same working directory:

```bash
git worktree add worktrees/photo-tagging -b feature/add-photo-tagging
git worktree add worktrees/thumbnail-fix -b fix/thumbnail-cache-bug
```

Then open a separate Claude Code session in each worktree folder and run
`/sdd <change-name>` in each — same `specs/` artifacts convention, but the
actual code edits happen on isolated branches/directories, so `sdd-apply`
in one session can't step on file changes from the other. Merge each
branch back to `main` once its `sdd-verify` passes.



Not everything needs all 10 phases. A one-line typo fix or a trivial
config change doesn't need a proposal and a spec — just fix it directly.
Reach for `/sdd` when a change is big enough that you'd want to review the
plan before the code exists.