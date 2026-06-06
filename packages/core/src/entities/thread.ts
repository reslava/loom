import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { DoneDoc } from './done';
import { ChatDoc } from './chat';
import { ReqDoc } from './req';
import { Document } from './document';
import { ReqCoverage } from '../reqCoverage';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';

export type Fiber = Document;

export interface Thread {
    id: string;
    weaveId: string;
    idea?: IdeaDoc;
    design?: DesignDoc;
    req?: ReqDoc;
    plans: PlanDoc[];
    dones: DoneDoc[];
    chats: ChatDoc[];
    refDocs: Document[];
    allDocs: Document[];
    /**
     * Derived (not persisted): the structural req-coverage result for this
     * thread's pooled plan steps against its locked req. Set by getState only
     * when the thread has a locked req and ≥1 plan; absent otherwise. Lets the
     * tree render a per-thread coverage badge without recomputing.
     */
    reqCoverage?: ReqCoverage;
}
