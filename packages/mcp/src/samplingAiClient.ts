import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { AIClient, Message } from '../../core/dist';
import { requestSampling, SamplingMessage } from './sampling';

export function samplingAiClient(server: Server, maxTokens = 4096): AIClient {
    return {
        async complete(messages: Message[]): Promise<string> {
            const systemMessages = messages.filter(m => m.role === 'system');
            const nonSystem = messages.filter(m => m.role !== 'system');
            const systemPrompt = systemMessages.map(m => m.content).join('\n\n') || undefined;

            const samplingMessages: SamplingMessage[] = nonSystem.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: { type: 'text', text: m.content },
            }));

            return requestSampling(server, samplingMessages, systemPrompt, maxTokens);
        },
    };
}
