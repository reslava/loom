import { Thread } from '../entities/thread';
import { ThreadStatus } from '../entities/thread';
import { getThreadStatus, getThreadPhase } from '../derived';

/**
 * Filters an array of threads by their derived status.
 *
 * @param threads - The array of threads to filter.
 * @param statuses - The allowed status values.
 * @returns A new array containing only threads with a status in the given list.
 */
export function filterThreadsByStatus(threads: Thread[], statuses: ThreadStatus[]): Thread[] {
    return threads.filter(t => statuses.includes(getThreadStatus(t)));
}

/**
 * Filters an array of threads by their derived phase.
 *
 * @param threads - The array of threads to filter.
 * @param phases - The allowed phase values (e.g., 'designing', 'implementing').
 * @returns A new array containing only threads with a phase in the given list.
 */
export function filterThreadsByPhase(threads: Thread[], phases: string[]): Thread[] {
    return threads.filter(t => phases.includes(getThreadPhase(t)));
}

/**
 * Filters an array of threads by a pattern matched against their ID.
 *
 * @param threads - The array of threads to filter.
 * @param pattern - A case‑insensitive substring or regular expression.
 * @returns A new array containing only threads whose ID matches the pattern.
 */
export function filterThreadsById(threads: Thread[], pattern: string): Thread[] {
    const regex = new RegExp(pattern, 'i');
    return threads.filter(t => regex.test(t.id));
}