import { Thread } from './thread';
import { ChatDoc } from './chat';
import { Document } from './document';

export type WeaveStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';
export type WeavePhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Weave {
    id: string;
    threads: Thread[];
    looseFibers: Document[];
    chats: ChatDoc[];
    refDocs: Document[];
    allDocs: Document[];
}
