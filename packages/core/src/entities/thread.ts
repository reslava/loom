import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { Document } from './document';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';
export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Thread {
    id: string;
    ideas: IdeaDoc[];
    designs: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    allDocs: Document[];
}