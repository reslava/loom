export function generatePlanBody(title: string, goal?: string, steps?: string[]): string {
    const goalSection = goal ? `\n${goal}\n` : '\n<!-- One paragraph: what this plan implements and why. -->\n';

    const hasSteps = steps && steps.length > 0;
    const tableRows = hasSteps
        ? steps!.map((s, i) => `| \u{1F533} | ${i + 1} | ${s} | — | — |`).join('\n')
        : '| \u{1F533} | 1 | {Step description} | — | — |';

    // No header mini-table: created / status / design / target_version all live in
    // frontmatter (the single source of truth). Duplicating them in the body only
    // drifts (e.g. a static "Status: DRAFT" left behind on a done plan).
    return `
## Goal
${goalSection}---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
${tableRows}

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| \u{1F504} | In Progress |
| \u{1F533} | Pending |
| ❌ | Cancelled |
`;
}
