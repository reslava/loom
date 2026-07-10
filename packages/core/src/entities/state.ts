import { Weave } from './weave';
import { Thread } from './thread';
import { LinkIndex } from '../linkIndex';
import { Document } from './document';
import { ChatDoc } from './chat';

export type LoomMode = 'mono' | 'multi';

export interface LoomState {
    /** The absolute path to the active loom root. */
    loomRoot: string;

    /** The operational mode: mono‑loom (local) or multi‑loom (global registry). */
    mode: LoomMode;

    /** The name of the active loom (for multi‑loom) or '(local)' for mono‑loom. */
    loomName: string;

    /** Docs living directly at the loom/ root (outside any weave), e.g. ctx.md. */
    globalDocs: Document[];

    /** Chats living in loom/chats/ (outside any weave). */
    globalChats: ChatDoc[];

    /** All weaves in the active loom. */
    weaves: Weave[];

    /**
     * Archived threads — the atomic archive unit. Each is a whole thread folder moved
     * to loom/.archive/{weave}/{thread}/ (a Thread carries its weaveSlug + id). Archiving
     * is thread-granular: individual docs are never archived on their own.
     */
    archivedThreads: Thread[];

    /**
     * Archived references (and refs chats) from loom/.archive/refs/. References live in
     * loom/refs/ with no thread, so they're their own atomic archive unit — archived
     * individually, unlike thread docs which archive with their whole thread.
     */
    archivedRefDocs: Document[];

    /** The link index built during state generation. */
    index: LinkIndex;
    
    /** Timestamp when this state was generated. */
    generatedAt: string;
    
    /** Summary statistics. */
    summary: {
        totalWeaves: number;
        activeWeaves: number;
        implementingWeaves: number;
        doneWeaves: number;
        totalPlans: number;
        stalePlans: number;
        staleIdeas: number;
        staleDesigns: number;
        blockedSteps: number;
        /** Total req scope-coverage problems (uncovered Included + excluded/unknown citations) across locked-req threads. */
        reqCoverageGaps: number;
    };
}