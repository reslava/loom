import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';

export interface Thread {
    id: string;
    idea?: IdeaDoc;
    design: DesignDoc;
    supportingDesigns: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    allDocs: Document[];
}

// Re‑export Document type to avoid circular dependencies
import { Document } from '../types';