import { BaseDoc } from './base';

export type ChatStatus = 'active' | 'archived';

export interface ChatDoc extends BaseDoc<ChatStatus> {
    type: 'chat';
    status: ChatStatus;
    /** Read-cursor for the tail-read optimization: 0-based index of the last AI-authored
     *  `## {ai}` block. loom_append_to_chat advances it; loom_read_chat_tail reads from it
     *  to return only the human turns since the AI last replied. Absent on legacy chats. */
    last_ai_block?: number;
}
