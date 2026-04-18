npm install --save-dev ts-node @types/node

npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
// PENDING npx ts-node --project tests/tsconfig.json tests/mono-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts