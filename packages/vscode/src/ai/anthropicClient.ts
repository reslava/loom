import { AIClient, Message } from '@reslava-loom/core/dist';

interface AnthropicResponse {
    content: Array<{ type: string; text: string }>;
}

export class AnthropicClient implements AIClient {
    constructor(
        private readonly apiKey: string,
        private readonly model: string,
        private readonly baseUrl: string,
    ) {}

    async complete(messages: Message[]): Promise<string> {
        const system = messages.find(m => m.role === 'system')?.content;
        const rest = messages.filter(m => m.role !== 'system');

        const body: Record<string, unknown> = {
            model: this.model,
            max_tokens: 8192,
            messages: rest,
        };
        if (system) body['system'] = system;

        const response = await fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`AI API error ${response.status}: ${text}`);
        }

        const data = await response.json() as AnthropicResponse;
        return data.content[0]?.text ?? '';
    }
}
