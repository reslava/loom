/**
 * Generates the Markdown body for a design document.
 * @param title - The title of the design.
 * @param userName - The name to use in the chat header (defaults to 'User').
 * @returns The complete Markdown body (excluding frontmatter).
 */
export function generateDesignBody(title: string, userName: string = 'User'): string {
    return `
## Goal
<!-- What does this design solve? One paragraph. -->

## Context
<!-- Background, constraints, prior art, related designs. -->
`;
}