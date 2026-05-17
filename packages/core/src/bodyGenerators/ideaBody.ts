/**
 * Generates the Markdown body for an idea document.
 * @param title - The title of the idea.
 * @returns The complete Markdown body (excluding frontmatter).
 */
export function generateIdeaBody(title: string): string {
    return `
## Problem
<!-- What pain or gap does this idea address? -->

## Idea
<!-- The core concept in 2-3 sentences. -->

## Why now
<!-- What makes this worth pursuing at this point? -->

## Open questions
<!-- What needs to be answered before committing to a design? -->

## Next step
<!-- design | spike | discard -->
`;
}