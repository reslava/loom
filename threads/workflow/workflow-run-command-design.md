---
type: design
id: workflow-run-command-design
title: "run_command Effect — Design Specification"
status: draft
created: 2026-04-11
version: 1.0.0
tags: [workflow, effects, security, templating]
parent_id: workflow-design-v2
role: supporting
child_ids: []
requires_load: []
---

# `run_command` Effect — Design Specification

## Goal

Define a **safe, flexible `run_command` effect** that allows workflow authors to execute external commands (scripts, tools, code generators) as part of event handling. The effect supports **templating** (injecting workflow context), **environment variables**, and includes **strong security defaults**.

## Context

The built‑in effect library (see `workflow-design-v2.md`, section 17.4) covers common needs like version increment, child creation, and notifications. However, power users often need to:

- Run a linter or formatter after a document changes.
- Trigger a static site generator after publishing a post.
- Call an external API via `curl`.
- Run a custom script that processes workflow documents.

The `run_command` effect provides this escape hatch while maintaining safety through opt‑in, sandboxing, and clear guardrails.

---

## 1. Effect Definition

In `workflow.yml`, the `run_command` effect is used like any other effect:

```yaml
events:
  - name: PUBLISH
    applies_to: post
    from_status: editorial
    to_status: published
    effects:
      - run_command
        params:
          command: "./scripts/publish.sh {{feature.path}}"
          cwd: "{{workspaceRoot}}"
          timeout: 30000
          env:
            FEATURE_ID: "{{feature.id}}"
            POST_TITLE: "{{document.title}}"
```

### 1.1 Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | **Yes** | Shell command to execute. Supports templating (see Section 2). |
| `cwd` | string | No | Working directory for the command. Defaults to workspace root. Supports templating. |
| `timeout` | integer | No | Maximum execution time in milliseconds. Default: 60000 (60 seconds). |
| `env` | object | No | Additional environment variables (key‑value). Supports templating in values. |
| `shell` | string | No | Shell to use (e.g., `/bin/bash` on Unix, `cmd.exe` on Windows). Default: system default shell. |
| `allowFailure` | boolean | No | If true, command failure does not abort the event chain. Default: false. |

---

## 2. Templating System

Templating uses double curly braces `{{variable}}`. Variables are resolved **before** command execution.

### 2.1 Available Context Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `workspaceRoot` | Absolute path to the workspace root | `/home/user/project` |
| `feature.path` | Absolute path to the feature directory | `/home/user/project/features/auth` |
| `feature.id` | Feature identifier (directory name) | `auth` |
| `document.path` | Absolute path to the document being acted upon | `/home/user/project/features/auth/design.md` |
| `document.type` | Document type (e.g., `design`, `plan`) | `design` |
| `document.status` | Current status of the document | `active` |
| `document.version` | Document version (if present) | `3` |
| `event.name` | Name of the event being processed | `PUBLISH` |
| `params.<key>` | Custom parameters passed in the effect definition | `{{params.webhookUrl}}` |
| `env.<variable>` | Environment variable from the extension’s process (safe subset) | `{{env.HOME}}` (see security) |

### 2.2 Templating Examples

```yaml
# Simple command with feature path
command: "cd {{feature.path}} && npm run build"

# Using document path as argument
command: "python3 /scripts/validate.py {{document.path}}"

# Custom parameter
command: "curl -X POST {{params.webhookUrl}} -d 'status={{document.status}}'"
params:
  webhookUrl: "https://hooks.slack.com/xxx"
```

### 2.3 Escaping

If curly braces are needed literally, use `{{` and `}}` with a backslash escape: `\{{` and `\}}`. The templating engine will leave them untouched.

---

## 3. Environment Variables

### 3.1 Inherited Variables

The command inherits the extension’s environment **except** for sensitive ones (see Security). By default, `PATH`, `HOME`, `USER`, and common system variables are preserved.

### 3.2 Custom Variables via `env`

Users can add or override variables in the `env` block. Values support templating.

```yaml
env:
  FEATURE_ID: "{{feature.id}}"
  DESIGN_VERSION: "{{document.version}}"
  API_KEY: "{{params.apiKey}}"   # ⚠️ See security note below
```

### 3.3 Reserved Variables

The following variables are **set by the extension** and cannot be overridden:

- `WF_EVENT` – name of the event.
- `WF_DOCUMENT_PATH` – absolute path to the document.
- `WF_FEATURE_PATH` – absolute path to the feature.
- `WF_WORKSPACE_ROOT` – workspace root.

These are always available to the subprocess.

---

## 4. Execution Flow

When the orchestrator processes an event that includes `run_command`:

1. **Template resolution** – Replace all `{{...}}` placeholders using the current context.
2. **Validation** – Check that the resolved `command` is not empty and does not contain obvious dangerous patterns (see Security).
3. **Environment assembly** – Merge inherited env, reserved vars, and custom `env`.
4. **Process spawn** – Execute the command asynchronously (non‑blocking). The orchestrator waits for completion (or timeout).
5. **Output capture** – Stdout and stderr are captured and logged to the extension’s output channel (`WF: Command Output`).
6. **Success / Failure**:
   - If exit code `0` → continue to next effect.
   - If non‑zero and `allowFailure: false` → abort the entire event chain, log error, and optionally revert the document state? (See Section 6.)
   - If non‑zero and `allowFailure: true` → log warning and continue.

---

## 5. Security Notes (Critical)

### 5.1 Opt‑In Only

The `run_command` effect is **disabled by default**. Users must enable it via VS Code setting:

```json
"workflow.allowShellCommands": true
```

When a `workflow.yml` containing `run_command` is loaded with the setting disabled, the extension:
- Shows a warning notification.
- Treats the effect as a no‑op (logs an error and continues without executing).

### 5.2 Command Validation (Basic)

Before execution, the extension checks the resolved command string against a **deny list** of dangerous patterns (case‑insensitive):

- `rm -rf /` or `rm -rf /*`
- `:(){ :|:& };:` (fork bomb)
- `> /dev/sda` (raw disk write)
- `chmod 777 /`
- `sudo` (unless allowed by additional setting)
- `curl ... | bash` (piping from network to shell)

If a pattern matches, execution is blocked and an error is logged.

### 5.3 No Arbitrary Code Injection

Because templating uses simple string substitution, a malicious `workflow.yml` could try to inject extra commands using semicolons or `&&`. The extension does **not** attempt to sanitise this – it trusts the user (since they already enabled the setting). However, a warning is shown when the command contains shell metacharacters (`;`, `&&`, `||`, `|`, `` ` ``) and the setting is enabled.

### 5.4 Environment Variable Filtering

The following environment variables are **never** passed to the subprocess, regardless of inheritance or custom `env`:

- `AWS_SECRET_ACCESS_KEY`, `GITHUB_TOKEN`, `NPM_TOKEN` (common secrets)
- Any variable whose name contains `SECRET`, `PASSWORD`, `TOKEN`, `KEY` (case‑insensitive) **unless** the user explicitly allows it via `"workflow.allowSensitiveEnvVars": true`.

### 5.5 Timeout

All commands have a default timeout of 60 seconds to prevent infinite loops or hangs. Users can increase it up to 5 minutes via the `timeout` parameter (or a higher limit if configured in settings).

### 5.6 Workspace Restriction

By default, the command’s working directory (`cwd`) must be **inside** the workspace root. If a user attempts to set `cwd` to an absolute path outside (e.g., `/etc`), the extension rejects it unless `"workflow.allowOutsideCwd": true` is set.

---

## 6. Failure Handling & Rollback

The `run_command` effect runs **after** the document has already been updated (because effects run after `applyEvent` in the current design). This means that if a command fails, the document change is already persisted.

### 6.1 Default Behaviour (No Rollback)

- Command fails → effect logs error.
- If `allowFailure: false` (default), the orchestrator stops executing further effects, but the document change remains.
- User must manually fix the situation (e.g., revert the document via Git).

### 6.2 Optional Rollback (Advanced)

For critical commands, users can implement a two‑step pattern:

```yaml
effects:
  - run_command
    params:
      command: "./scripts/preflight-check.sh"
      allowFailure: false   # will stop event if fails
  - # actual document update is done by another effect (e.g., status change)
```

But because document status change is implicit in the event, this pattern is limited. A better approach is to **run commands before the event is applied** – this would require a redesign of the effects layer.

**Recommendation for MVP**: Do not implement rollback. Document clearly that commands should be idempotent and safe to retry. Users can use `allowFailure: true` to log but continue.

---

## 7. Logging & Debugging

All command invocations are logged to the `WF: Command Output` channel in VS Code:

```
[2026-04-11 10:30:00] Running command: ./scripts/publish.sh /workspace/features/blog-post
[2026-04-11 10:30:00] Working dir: /workspace
[2026-04-11 10:30:01] stdout: Publishing post "My Article"...
[2026-04-11 10:30:02] stdout: Done.
[2026-04-11 10:30:02] Exit code: 0
```

If a command fails, the full stdout/stderr is shown in an error notification (with an option to open the output channel).

---

## 8. Examples

### 8.1 Run a linter after design refinement

```yaml
events:
  - name: REFINE_DESIGN
    applies_to: design
    from_status: [active, closed, done]
    to_status: active
    effects:
      - increment_version
      - mark_children_staled
      - run_command
        params:
          command: "npx markdownlint {{document.path}} --fix"
          cwd: "{{workspaceRoot}}"
          allowFailure: true   # don't block if lint fails
```

### 8.2 Trigger a static site generator after publishing a blog post

```yaml
events:
  - name: PUBLISH
    applies_to: post
    from_status: editorial
    to_status: published
    effects:
      - run_command
        params:
          command: "bash ./scripts/build-site.sh"
          env:
            POST_PATH: "{{document.path}}"
            SITE_DIR: "{{workspaceRoot}}/public"
          timeout: 120000
```

### 8.3 Call a webhook with feature details

```yaml
effects:
  - run_command
    params:
      command: "curl -X POST https://mywebhook.com/events -H 'Content-Type: application/json' -d '{\"feature\":\"{{feature.id}}\",\"event\":\"{{event.name}}\"}'"
      allowFailure: true
```

---

## 9. Security Settings Summary

| Setting | Default | Description |
|---------|---------|-------------|
| `workflow.allowShellCommands` | `false` | Master switch for `run_command` effect. |
| `workflow.allowSensitiveEnvVars` | `false` | Allow passing secrets (e.g., tokens) to subprocess. |
| `workflow.allowOutsideCwd` | `false` | Allow command to run outside workspace root. |
| `workflow.commandTimeoutMs` | `60000` | Global maximum timeout (overrides per‑effect timeout). |
| `workflow.denyListPatterns` | `["rm -rf /", "fork bomb", ...]` | Additional user‑defined deny patterns. |

---

## 10. Implementation Notes for Extension Developers

- Use Node.js `child_process.spawn` (not `exec`) to avoid shell injection risks when using templated commands (still need to pass shell if user requests it).
- For templating, a simple regex replace with a context object is sufficient. Use a library like `lodash.template` or a custom `{{...}}` parser.
- Timeout: use `setTimeout` + `child.kill()`.
- Output capture: stream stdout/stderr to the output channel in real time.
- Security checks: after template resolution, run deny list regexes. If matches, throw a user‑friendly error.

---

## 11. Future Enhancements (Post‑MVP)

- **Dry‑run mode**: Preview the command that would be executed without running it.
- **Approval prompt**: Before running a command, show a VS Code dialog asking for confirmation (useful for destructive commands).
- **Sandboxed execution**: Use `containerd` or `firecracker` for untrusted workflows (overkill for most use cases).
- **Command caching**: If the same command with same context runs multiple times, skip execution (idempotency).

---

## 12. Relationship to `actions.js` (Power User Scripts)

The `run_command` effect is **not** a replacement for `actions.js` (custom JavaScript functions). Instead, it complements it:

- Use `run_command` for calling external tools, scripts, or CLIs.
- Use `actions.js` (if implemented later) for complex logic that needs to interact with the extension’s API (e.g., modifying the tree view, showing custom UI).

For MVP, `run_command` alone covers 90% of power‑user needs without the security risks of arbitrary code execution inside the extension process.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-11 | Initial specification. |