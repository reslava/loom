import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document, parseStepsTable, parseFrontmatterSteps } from '../../../core/dist';

export class FrontmatterParseError extends Error {
  constructor(
    public filePath: string,
    public rawFrontmatter: string,
    message: string
  ) {
    super(`Invalid frontmatter in ${filePath}: ${message}`);
    this.name = 'FrontmatterParseError';
  }
}

export async function loadDoc(filePath: string): Promise<Document> {
  const content = await fs.readFile(filePath, 'utf8');
  
  let parsed;
  try {
    parsed = matter(content);
  } catch (e) {
    throw new FrontmatterParseError(filePath, '', `YAML syntax error: ${(e as Error).message}`);
  }

  // Validate required fields
  const requiredFields = ['type', 'id', 'status', 'created', 'version'];
  for (const field of requiredFields) {
    if (parsed.data[field] === undefined) {
      throw new FrontmatterParseError(
        filePath,
        JSON.stringify(parsed.data),
        `Missing required field: ${field}`
      );
    }
  }

  const doc = {
    ...parsed.data,
    content: parsed.content,
    _path: filePath,
  } as Document;

  // Plan steps: frontmatter is the source of truth. If a structured `steps` block is
  // present, use it (the body table is a generated view, ignored on load). Otherwise
  // fall back to parsing the body table — a READ-ONLY legacy bridge for not-yet-migrated
  // plans. `_stepsFromFrontmatter` records which path was taken so the saver only
  // re-persists frontmatter steps for already-migrated docs (no implicit migration on save).
  if (doc.type === 'plan') {
    if (Array.isArray((parsed.data as any).steps)) {
      doc.steps = parseFrontmatterSteps((parsed.data as any).steps);
      (doc as any)._stepsFromFrontmatter = true;
    } else if (parsed.content) {
      doc.steps = parseStepsTable(parsed.content);
      (doc as any)._stepsFromFrontmatter = false;
    } else {
      doc.steps = [];
      (doc as any)._stepsFromFrontmatter = false;
    }
  }

  return doc;
}