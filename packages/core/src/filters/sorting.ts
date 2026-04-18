import { Thread } from '../entities/thread';
import { Document } from '../entities/document';

/**
 * Sorts an array of threads by their ID.
 *
 * @param threads - The array of threads to sort.
 * @param ascending - If true, sorts A→Z; if false, sorts Z→A. Defaults to true.
 * @returns A new sorted array.
 */
export function sortThreadsById(threads: Thread[], ascending: boolean = true): Thread[] {
    return [...threads].sort((a, b) => 
        ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
    );
}

/**
 * Sorts an array of documents by their creation date.
 *
 * @param docs - The array of documents to sort.
 * @param ascending - If true, oldest first; if false, newest first. Defaults to true.
 * @returns A new sorted array.
 */
export function sortDocumentsByCreated<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        return ascending ? dateA - dateB : dateB - dateA;
    });
}

/**
 * Sorts an array of documents by their title.
 *
 * @param docs - The array of documents to sort.
 * @param ascending - If true, sorts A→Z; if false, sorts Z→A. Defaults to true.
 * @returns A new sorted array.
 */
export function sortDocumentsByTitle<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => 
        ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
}