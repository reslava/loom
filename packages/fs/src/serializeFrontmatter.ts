/**
 * Serializes a value for YAML frontmatter.
 * - Arrays become inline: [a, b, c]
 * - Strings are quoted only if they contain special characters
 * - null/undefined become 'null'
 */
function serializeValue(value: any): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.map(v => serializeValue(v)).join(', ')}]`;
  }

  if (typeof value === 'string') {
    // Quote if it contains YAML special characters or starts/ends with whitespace
    if (/[:#\n]/.test(value) || value.trim() !== value) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return 'null';
  }

  // Fallback for unexpected types (should not happen in Loom frontmatter)
  return JSON.stringify(value);
}

/**
 * Canonical key order for Loom frontmatter.
 * Any keys not in this list are appended alphabetically.
 */
const ORDERED_KEYS = [
  'type',
  'id',
  'title',
  'status',
  'created',
  'updated',
  'version',
  'design_version',
  'tags',
  'parent_id',
  'child_ids',
  'requires_load',
  'role',
  'target_release',
  'actual_release',
  'target_version',
  'source_version',
  'staled',
  'refined',
];

/**
 * Serializes a Loom frontmatter object into a deterministic YAML string.
 */
export function serializeFrontmatter(obj: Record<string, any>): string {
  const presentKeys = new Set(Object.keys(obj));
  
  // Start with ordered keys that are present
  const orderedPresent = ORDERED_KEYS.filter(k => presentKeys.has(k));
  
  // Add any remaining keys in alphabetical order
  const remaining = Object.keys(obj)
    .filter(k => !ORDERED_KEYS.includes(k))
    .sort();
  
  const keys = [...orderedPresent, ...remaining];

  const lines = keys.map(key => {
    const value = serializeValue(obj[key]);
    return `${key}: ${value}`;
  });

  const result = `---\n${lines.join('\n')}\n---`;  
  return result;
}