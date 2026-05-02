npm install --save-dev ts-node @types/node

// PENDING npx ts-node --project tests/tsconfig.json tests/mono-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts

Please always reply in English for this entire conversation.

only filenames
git status --porcelain | awk '{print $2}' | xargs -I {} basename {}


## MCP inspector
LOOM_ROOT=j:/temp npx @modelcontextprotocol/inspector node packages/mcp/dist/index.js

## VSCode extension

```bash
# Build only (esbuild, fast)
cd packages/vscode && npm run build

# Build + package VSIX  (runs build automatically via vscode:prepublish)
cd packages/vscode && npm run package

# Reinstall at j:/temp
code --install-extension j:/src/loom/packages/vscode/loom-vscode-0.1.0.vsix --force
```

The `npm run package` script is the single command — it builds and packages in one step.


## MCP Server:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | loom mcp
```
If you get a JSON response with `"name":"loom"`, the server is up. If it hangs or errors, the `loom` binary is not on PATH or failed to build.