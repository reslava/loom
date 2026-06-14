import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { DoneDoc } from './done';
import { ChatDoc } from './chat';
import { ReqDoc } from './req';
import { Document } from './document';
import { BaseDoc } from './base';
import { ReqCoverage } from '../reqCoverage';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';

/**
 * Structural doc-status of a thread manifest. A thread.md carries no workflow
 * lifecycle of its own (it is authored metadata, not a deliverable), so its
 * `status` is a constant placeholder required of every Loom doc — NOT the derived
 * roadmap status (`ThreadStatus` above), which is never persisted.
 */
export type ThreadDocStatus = 'active';

/**
 * Thread manifest — one flat `thread.md` per thread (mirrors the `req.md`
 * precedent: flat filename, a BaseDoc with no reducer). Holds ONLY authored
 * metadata: a stable `th_` ULID identity, a soft `priority` (ordering among the
 * slack dependencies leave free), and hard `depends_on` edges (other threads'
 * `th_` ULIDs, resolvable cross-weave). Derived roadmap status/history are NEVER
 * stored here — they fall out of `buildRoadmap`.
 */
export interface ThreadDoc extends BaseDoc<ThreadDocStatus> {
    type: 'thread';
    status: ThreadDocStatus;
    /** Soft ordering among dependency-free slack (lower = earlier). */
    priority: number;
    /** Hard dependency edges: `th_` ULIDs of threads this one depends on. */
    depends_on: string[];
}

export type Fiber = Document;

export interface Thread {
    id: string;
    weaveId: string;
    idea?: IdeaDoc;
    design?: DesignDoc;
    req?: ReqDoc;
    /** The thread manifest (thread.md): authored `th_` ULID + priority + depends_on. */
    manifest?: ThreadDoc;
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
