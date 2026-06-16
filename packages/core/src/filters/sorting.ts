import { Weave } from '../entities/weave';
import { Document } from '../entities/document';
import { compareDates } from '../dates';

/**
 * Sorts an array of weaves by their ID.
 */
export function sortWeavesById(weaves: Weave[], ascending: boolean = true): Weave[] {
    return [...weaves].sort((a, b) => 
        ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
    );
}

/**
 * Sorts an array of documents by their creation date.
 */
export function sortDocumentsByCreated<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) =>
        ascending ? compareDates(a.created, b.created) : compareDates(b.created, a.created)
    );
}

/**
 * Sorts an array of documents by their title.
 */
export function sortDocumentsByTitle<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => 
        ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
}