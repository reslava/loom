// Utilities
export * from './utils/pathUtils';
export * from './utils/workspaceUtils';
export { moveTreeOrThrow } from './utils/moveTree';

// Serializers
export { loadDoc, FrontmatterParseError } from './serializers/frontmatterLoader';
export { saveDoc, FileWriteError, FilePermissionError } from './serializers/frontmatterSaver';

// Repositories
export { loadWeave, saveWeave, saveDocs } from './repositories/weaveRepository';
export { loadThread, saveThread, docPathInThread } from './repositories/threadRepository';
export { buildLinkIndex, updateIndexForFile, resolveDocIdOrThrow, ResolvedDoc } from './repositories/linkRepository';
export {
    readContextPrefs,
    readContextPrefsEntry,
    setContextPrefs,
    SetContextPrefsInput,
} from './repositories/contextPrefsRepository';
export { ConfigRegistry, LoomEntry, LoomRegistry } from './repositories/registryRepository';