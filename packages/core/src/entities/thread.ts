import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { DoneDoc } from './done';
import { ChatDoc } from './chat';
import { Document } from './document';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';

export type Fiber = Document;

export interface Thread {
    id: string;
    weaveId: string;
    idea?: IdeaDoc;
    design?: DesignDoc;
    plans: PlanDoc[];
    dones: DoneDoc[];
    chats: ChatDoc[];
    refDocs: Document[];
    allDocs: Document[];
}
