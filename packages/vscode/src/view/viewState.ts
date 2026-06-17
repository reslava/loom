export type GroupingMode = 'type' | 'thread' | 'status' | 'release';

/** Which band(s) of the roadmap are shown when the Roadmap view is enabled. */
export type RoadmapBand = 'all' | 'history' | 'roadmap';

/** How the History band groups/sorts shipped plans. */
export type HistoryGrouping = 'date' | 'thread' | 'release';

export interface ViewState {
    grouping: GroupingMode;
    textFilter?: string;
    statusFilter: string[];
    showArchived: boolean;
    focusedweaveId?: string;
    syncDocToTreeEnabled: boolean;
    /** Roadmap view toggle — when on, the tree re-lays out into a Roadmap band + History band. */
    roadmapEnabled: boolean;
    /** Which roadmap band(s) to show (the filter folds to this when roadmap is enabled). */
    roadmapBand: RoadmapBand;
    /** History band grouping: by release version (default), by thread, or flat by date. */
    historyGrouping: HistoryGrouping;
}

export const defaultViewState: ViewState = {
    grouping: 'thread',
    textFilter: '',
    statusFilter: [],
    showArchived: false,
    syncDocToTreeEnabled: true,
    roadmapEnabled: false,
    roadmapBand: 'all',
    historyGrouping: 'release',
};