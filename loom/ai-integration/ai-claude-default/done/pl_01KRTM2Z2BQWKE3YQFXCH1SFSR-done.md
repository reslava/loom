---
type: done
id: pl_01KRTM2Z2BQWKE3YQFXCH1SFSR-done
title: Done — Add Claude as default AI provider
status: done
created: "2026-05-17T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KRTM2Z2BQWKE3YQFXCH1SFSR
requires_load: []
---
## Step 1 — Create packages/vscode/src/ai/anthropicClient.ts — implement AnthropicClient class using raw fetch against https://api.anthropic.com/v1/messages endpoint, extract system message to top-level field, return first content text

Created new AnthropicClient class in `packages/vscode/src/ai/anthropicClient.ts`. Implements AIClient interface using raw fetch pattern (no SDK dependency). Extracts system message to top-level field per Anthropic API requirements, uses `anthropic-version: 2023-06-01` header, and max_tokens: 8192."

## Step 2 — Update packages/vscode/src/ai/makeAIClient.ts — add anthropic to PROVIDER_DEFAULTS with claude-haiku-4-5-20251001 as default, change default provider from deepseek to anthropic, add conditional to return AnthropicClient for anthropic provider

Updated `packages/vscode/src/ai/makeAIClient.ts`: (1) imported AnthropicClient, (2) added anthropic to PROVIDER_DEFAULTS with claude-haiku-4-5-20251001 as default model, (3) changed default provider from 'deepseek' to 'anthropic', (4) updated fallback from PROVIDER_DEFAULTS['deepseek'] to PROVIDER_DEFAULTS['anthropic'], (5) added conditional routing: if provider === 'anthropic' return AnthropicClient, else return OpenAIClient."

## Step 3 — Update packages/vscode/package.json — add anthropic to reslava-loom.ai.provider enum, set default to anthropic, update description to mention Claude

Updated `packages/vscode/package.json` configuration: (1) added 'anthropic' to reslava-loom.ai.provider enum, (2) changed default from 'deepseek' to 'anthropic', (3) updated description to mention Claude/Anthropic, (4) updated model description to include claude-haiku-4-5-20251001 in defaults, (5) updated walkthrough step to mention Claude alongside DeepSeek and OpenAI."

## Step 4 — Build and verify — run npm run package in packages/vscode, test with ANTHROPIC_API_KEY env var set, confirm Chat Reply calls Claude not DeepSeek

Successfully built extension: `npm run package` compiled extension.js (742.7 KB) and packaged loom-vscode-0.5.0.vsix (373.21 KB) with no errors. Extension now defaults to Claude for AI sampling in chat_reply and other MCP AI operations. Users can override to deepseek or openai via VS Code settings."
