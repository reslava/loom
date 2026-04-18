import { Thread } from '../../src/entities/thread';
import { Document } from '../../src/entities/document';
import { sortThreadsById, sortDocumentsByCreated, sortDocumentsByTitle } from '../../src/filters/sorting';

describe('sorting', () => {
    const mockThreads: Thread[] = [
        { id: 'z-thread' } as Thread,
        { id: 'a-thread' } as Thread,
        { id: 'm-thread' } as Thread,
    ];

    const mockDocs: Document[] = [
        { id: 'doc-1', created: '2024-01-01', title: 'Zebra' } as Document,
        { id: 'doc-2', created: '2023-01-01', title: 'Apple' } as Document,
        { id: 'doc-3', created: '2025-01-01', title: 'Moon' } as Document,
    ];

    describe('sortThreadsById', () => {
        it('should sort ascending by default', () => {
            const result = sortThreadsById(mockThreads);
            expect(result[0].id).toBe('a-thread');
            expect(result[1].id).toBe('m-thread');
            expect(result[2].id).toBe('z-thread');
        });

        it('should sort descending when specified', () => {
            const result = sortThreadsById(mockThreads, false);
            expect(result[0].id).toBe('z-thread');
            expect(result[2].id).toBe('a-thread');
        });
    });

    describe('sortDocumentsByCreated', () => {
        it('should sort ascending (oldest first) by default', () => {
            const result = sortDocumentsByCreated(mockDocs);
            expect(result[0].id).toBe('doc-2'); // 2023
            expect(result[1].id).toBe('doc-1'); // 2024
            expect(result[2].id).toBe('doc-3'); // 2025
        });

        it('should sort descending (newest first) when specified', () => {
            const result = sortDocumentsByCreated(mockDocs, false);
            expect(result[0].id).toBe('doc-3'); // 2025
            expect(result[2].id).toBe('doc-2'); // 2023
        });
    });

    describe('sortDocumentsByTitle', () => {
        it('should sort ascending by default', () => {
            const result = sortDocumentsByTitle(mockDocs);
            expect(result[0].title).toBe('Apple');
            expect(result[1].title).toBe('Moon');
            expect(result[2].title).toBe('Zebra');
        });

        it('should sort descending when specified', () => {
            const result = sortDocumentsByTitle(mockDocs, false);
            expect(result[0].title).toBe('Zebra');
            expect(result[2].title).toBe('Apple');
        });
    });
});