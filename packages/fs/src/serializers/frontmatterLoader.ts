import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document } from '../../../core/dist/types';
import { parseStepsTable } from '../../../core/dist/planTableUtils';

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

  // Parse steps for plan documents using the shared utility
  if (doc.type === 'plan' && parsed.content) {
    doc.steps = parseStepsTable(parsed.content);
  }

  return doc;
}