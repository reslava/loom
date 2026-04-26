npm install --save-dev ts-node @types/node

// PENDING npx ts-node --project tests/tsconfig.json tests/mono-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts

Please always reply in English for this entire conversation.

only filenames
git status --porcelain | awk '{print $2}' | xargs -I {} basename {}