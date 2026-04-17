import * as fs from 'fs-extra';
import * as path from 'path';
import { Document } from '../../../core/dist/types';
import { serializeFrontmatter } from '../../../core/dist/frontmatterUtils';
import { updateStepsTableInContent } from '../../../core/dist/planTableUtils';

export class FileWriteError extends Error {
  constructor(public filePath: string, originalError: Error) {
    super(`Failed to write ${filePath}: ${originalError.message}`);
    this.name = 'FileWriteError';
  }
}

export class FilePermissionError extends Error {
  constructor(public filePath: string) {
    super(`Permission denied writing to ${filePath}`);
    this.name = 'FilePermissionError';
  }
}

export async function saveDoc(doc: Document, filePath: string): Promise<void> {
  // Separate internal properties from frontmatter
  const { content, _path, steps, ...frontmatter } = doc as any;

  let bodyContent = content;
  if (doc.type === 'plan' && steps) {
    bodyContent = updateStepsTableInContent(content, steps);
  }

  // Serialize frontmatter using the canonical serializer
  const frontmatterStr = serializeFrontmatter(frontmatter);
  const output = `${frontmatterStr}\n${bodyContent}`;

  await fs.ensureDir(path.dirname(filePath));

  const tempPath = path.join(
    path.dirname(filePath),
    `.loom-tmp-${Date.now()}-${path.basename(filePath)}.tmp`
  );

  try {
    await fs.writeFile(tempPath, output, { mode: 0o644 });
    try {
      await fs.rename(tempPath, filePath);
    } catch (renameErr: any) {
      if (renameErr.code === 'EXDEV') {
        await fs.copyFile(tempPath, filePath);
        await fs.remove(tempPath);
      } else {
        throw renameErr;
      }
    }
  } catch (e: any) {
    await fs.remove(tempPath).catch(() => {});
    
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      throw new FilePermissionError(filePath);
    }
    if (e.code === 'ENOSPC') {
      throw new FileWriteError(filePath, new Error('Disk full'));
    }
    throw new FileWriteError(filePath, e);
  }
}