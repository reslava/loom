import * as vscode from 'vscode';
import { AIClient } from '@reslava-loom/core/dist';
import { OpenAIClient } from './openAIClient';
import { AnthropicClient } from './anthropicClient';

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
    anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-haiku-4-5-20251001' },
    deepseek:  { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    openai:    { baseUrl: 'https://api.openai.com/v1',   model: 'gpt-4o-mini' },
};

export function makeAIClient(): AIClient {
    const config = vscode.workspace.getConfiguration('reslava-loom.ai');
    const provider = config.get<string>('provider', 'anthropic');
    const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS['anthropic'];

    const apiKey  = config.get<string>('apiKey', '');
    const model   = config.get<string>('model',   '') || defaults.model;
    const baseUrl = config.get<string>('baseUrl', '') || defaults.baseUrl;

    if (!apiKey) {
        throw new Error(
            'No AI API key configured. Set "reslava-loom.ai.apiKey" in VS Code settings.'
        );
    }

    if (provider === 'anthropic') {
        return new AnthropicClient(apiKey, model, baseUrl);
    }
    return new OpenAIClient(apiKey, model, baseUrl);
}
