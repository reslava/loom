import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { DoneDoc } from './done';
import { ChatDoc } from './chat';
import { ReqDoc } from './req';
import { Document } from './document';

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
}
