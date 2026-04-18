import { Document } from '../../src/entities/document';
import { filterDocumentsByType, filterDocumentsByStatus, filterDocumentsByTitle } from '../../src/filters/documentFilters';

describe('documentFilters', () => {
    const mockDocs: Document[] = [
        { id: 'doc-1', type: 'design', status: 'active', title: 'Design Doc' } as Document,
        { id: 'doc-2', type: 'plan', status: 'done', title: 'Plan Doc' } as Document,
        { id: 'doc-3', type: 'idea', status: 'active', title: 'Idea Doc' } as Document,
    ];

    describe('filterDocumentsByType', () => {
        it('should filter by single type', () => {
            const result = filterDocumentsByType(mockDocs, ['design']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('doc-1');
        });

        it('should filter by multiple types', () => {
            const result = filterDocumentsByType(mockDocs, ['design', 'idea']);
            expect(result).toHaveLength(2);
        });
    });

    describe('filterDocumentsByStatus', () => {
        it('should filter by status', () => {
            const result = filterDocumentsByStatus(mockDocs, ['active']);
            expect(result).toHaveLength(2);
        });
    });

    describe('filterDocumentsByTitle', () => {
        it('should filter by title pattern', () => {
            const result = filterDocumentsByTitle(mockDocs, 'design');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('doc-1');
        });
    });
});