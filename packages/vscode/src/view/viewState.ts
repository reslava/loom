export type GroupingMode = 'type' | 'thread' | 'status' | 'release';

export interface ViewState {
    grouping: GroupingMode;
    textFilter?: string;
    statusFilter: string[];
    showArchived: boolean;
    focusedweaveId?: string;
}

export const defaultViewState: ViewState = {
    grouping: 'thread',
    textFilter: '',
    statusFilter: [],
    showArchived: false,
};