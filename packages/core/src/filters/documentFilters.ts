import { Document } from '../entities/document';
import { DocumentStatus } from '../entities/document';

/**
 * Filters an array of documents by their type.
 *
 * @param docs - The array of documents to filter.
 * @param types - The allowed document types ('idea', 'design', 'plan', 'ctx').
 * @returns A new array containing only documents with a type in the given list.
 */
export function filterDocumentsByType<T extends Document>(docs: T[], types: string[]): T[] {
    return docs.filter(d => types.includes(d.type));
}

/**
 * Filters an array of documents by their status.
 *
 * @param docs - The array of documents to filter.
 * @param statuses - The allowed status values.
 * @returns A new array containing only documents with a status in the given list.
 */
export function filterDocumentsByStatus<T extends Document>(docs: T[], statuses: DocumentStatus[]): T[] {
    return docs.filter(d => statuses.includes(d.status));
}

/**
 * Filters an array of documents by a pattern matched against their title.
 *
 * @param docs - The array of documents to filter.
 * @param pattern - A case‑insensitive substring or regular expression.
 * @returns A new array containing only documents whose title matches the pattern.
 */
export function filterDocumentsByTitle<T extends Document>(docs: T[], pattern: string): T[] {
    const regex = new RegExp(pattern, 'i');
    return docs.filter(d => regex.test(d.title));
}