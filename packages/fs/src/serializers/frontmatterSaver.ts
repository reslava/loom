import * as fs from 'fs-extra';
import * as path from 'path';
import { Document, serializeFrontmatter, updateStepsTableInContent, syncBodyH1 } from '../../../core/dist';

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
  // Separate internal/transient properties from frontmatter. `_stepsFromFrontmatter`
  // is a load-time provenance marker (see frontmatterLoader) — never serialized.
  const { content, _path, _stepsFromFrontmatter, steps, ...rest } = doc as any;

  // A plan is "frontmatter-native" when its steps came from (or were authored as) a
  // structured frontmatter block. Only those re-persist the steps block — a legacy
  // plan keeps its body table as the store until the explicit migration command
  // converts it, so saving (e.g. complete_step) never implicitly migrates.
  const frontmatterNative = doc.type === 'plan' && _stepsFromFrontmatter === true && Array.isArray(steps);

  // Body: the steps table is a generated view. Regenerate it from steps in place,
  // preserving the authored Goal / `### Step N` detail / Notes prose around it.
  let bodyContent = content;
  if (doc.type === 'plan' && steps) {
    bodyContent = updateStepsTableInContent(content, steps);
  }
  if (rest.title) {
    bodyContent = syncBodyH1(bodyContent ?? '', rest.title);
  }

  // Serialize frontmatter; include the structured steps block only for native plans.
  const frontmatter = frontmatterNative ? { ...rest, steps } : rest;
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