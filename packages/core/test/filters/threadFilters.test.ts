import { Thread } from '../../src/entities/thread';
import { filterThreadsByStatus, filterThreadsByPhase, filterThreadsById } from '../../src/filters/threadFilters';
import { getThreadStatus, getThreadPhase } from '../../src/derived';

// Mock getThreadStatus and getThreadPhase for predictable testing
jest.mock('../../src/derived', () => ({
    getThreadStatus: jest.fn(),
    getThreadPhase: jest.fn(),
}));

describe('threadFilters', () => {
    const mockThreads = [
        { id: 'thread-1' } as Thread,
        { id: 'thread-2' } as Thread,
        { id: 'thread-3' } as Thread,
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('filterThreadsByStatus', () => {
        it('should filter threads by status', () => {
            (getThreadStatus as jest.Mock).mockReturnValueOnce('ACTIVE')
                                          .mockReturnValueOnce('DONE')
                                          .mockReturnValueOnce('ACTIVE');

            const result = filterThreadsByStatus(mockThreads, ['ACTIVE']);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('thread-1');
            expect(result[1].id).toBe('thread-3');
        });

        it('should return empty array if no threads match', () => {
            (getThreadStatus as jest.Mock).mockReturnValue('DONE');
            const result = filterThreadsByStatus(mockThreads, ['ACTIVE']);
            expect(result).toHaveLength(0);
        });
    });

    describe('filterThreadsByPhase', () => {
        it('should filter threads by phase', () => {
            (getThreadPhase as jest.Mock).mockReturnValueOnce('designing')
                                         .mockReturnValueOnce('implementing')
                                         .mockReturnValueOnce('designing');

            const result = filterThreadsByPhase(mockThreads, ['designing']);
            expect(result).toHaveLength(2);
        });
    });

    describe('filterThreadsById', () => {
        it('should filter threads by id pattern', () => {
            const result = filterThreadsById(mockThreads, 'thread-1');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('thread-1');
        });

        it('should be case-insensitive', () => {
            const result = filterThreadsById(mockThreads, 'THREAD');
            expect(result).toHaveLength(3);
        });
    });
});