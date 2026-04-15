import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import { loadThread } from '../../../fs/dist/loadThread';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { serializeFrontmatter } from '../../../fs/dist/serializeFrontmatter';

/**
 * Extracts the content of a section by its heading.
 */
function extractSection(content: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '(Not specified)';
}

/**
 * Extracts key decisions from the conversation log.
 * This is a simple heuristic; a real implementation would use AI.
 */
function extractDecisions(content: string): string[] {
  const decisions: string[] = [];
  const lines = content.split('\n');
  let inDecision = false;
  
  for (const line of lines) {
    if (line.includes('Decision:') || line.includes('decided')) {
      decisions.push(line.trim());
      inDecision = true;
    } else if (inDecision && line.trim() === '') {
      inDecision = false;
    }
  }
  
  return decisions.length > 0 ? decisions : ['(No explicit decisions recorded)'];
}

/**
 * Extracts open questions from the conversation log.
 */
function extractQuestions(content: string): string[] {
  const questions: string[] = [];
  const regex = /\?\s*$/;
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (regex.test(line.trim()) && line.includes('## User:')) {
      questions.push(line.replace('## User:', '').trim());
    }
  }
  
  return questions.length > 0 ? questions : ['(No open questions)'];
}

export async function summariseCommand(threadId: string, options: { force?: boolean }): Promise<void> {
  try {
    const thread = await loadThread(threadId);
    const loomRoot = getActiveLoomRoot();
    const ctxPath = path.join(loomRoot, 'threads', threadId, `${threadId}-ctx.md`);

    // Check if summary already exists and is fresh
    if (!options.force && fs.existsSync(ctxPath)) {
      const existing = matter.read(ctxPath);
      if (existing.data.source_version === thread.design.version) {
        console.log(chalk.yellow(`⚠️  Context summary is already up to date (v${thread.design.version})`));
        console.log(chalk.gray(`   Use --force to regenerate.`));
        return;
      }
    }

    const designContent = thread.design.content || '';
    
    // Extract information
    const goal = extractSection(designContent, 'Goal');
    const context = extractSection(designContent, 'Context');
    const decisions = extractDecisions(designContent);
    const questions = extractQuestions(designContent);

    // Build summary content
    const now = new Date().toISOString();
    const summaryFrontmatter = {
      type: 'ctx',
      id: `${threadId}-ctx`,
      title: `Context Summary — ${thread.design.title}`,
      status: 'active',
      created: now.split('T')[0],
      version: 1,
      tags: ['ctx', 'summary'],
      parent_id: thread.design.id,
      requires_load: [],
      source_version: thread.design.version,
    };

    const summaryBody = `# Design Context Summary

## Problem Statement
${goal}

## Context
${context}

## Key Decisions Made
${decisions.map(d => `- ${d}`).join('\n')}

## Open Questions
${questions.map(q => `- ${q}`).join('\n')}

## Active Plans
${thread.plans.map(p => `- ${p.id} (status: ${p.status}, progress: ${p.steps?.filter(s => s.done).length || 0}/${p.steps?.length || 0} steps)`).join('\n')}

---
*Generated: ${now}*
`;

    const frontmatterStr = serializeFrontmatter(summaryFrontmatter);
    const output = `${frontmatterStr}\n${summaryBody}`;
    await fs.writeFile(ctxPath, output);

    console.log(chalk.green(`🧵 Context summary generated at ${ctxPath}`));
    console.log(chalk.gray(`   Source design version: v${thread.design.version}`));
  } catch (e: any) {
    console.error(chalk.red(`❌ Failed to summarise context: ${e.message}`));
    process.exit(1);
  }
}