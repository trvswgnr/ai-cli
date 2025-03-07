# AI CLI Development Guide

## Build & Run Commands
- Install: `bun install`
- Run: `bun run index.ts`
- Build & Install: `bun build ./index.ts --compile --outfile ai && mv ./ai ~/.bun/bin/ai`
- Format: `bunx @biomejs/biome format --write .`
- Typecheck: `bunx tsc --noEmit`

## Features
- **Conversation Persistence**: Uses bun:sqlite to store conversations
  - Conversations continue across CLI invocations
  - Use the `--new` or `-n` flag to start a new conversation
  - Database stored in `~/.ai-cli/conversations.db`

## Code Style Guidelines
- **Formatting**: 4-space indentation, double quotes for strings
- **Types**: Use TypeScript with strict mode enabled, prefer explicit return types
- **Imports**: Use ESM imports, organize imports (auto-formatted)
- **Error Handling**: Throw string messages for user-facing errors, use try/catch for expected failures
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces/classes
- **Functions**: Prefer async/await over callbacks, use arrow functions for consistency
- **Comments**: Add JSDoc for public APIs, explain complex code sections only
- **TypeScript**: Enable strict checks, prefer type safety with helper types when needed
- **Files**: One component/feature per file, use .ts extension

## Memory
Use this space to save notes and useful information to help give context for future coding sessions. Update this file/section regularly.
<memory>
- The CLI uses bun:sqlite for conversation persistence
- Conversations are stored in ~/.ai-cli/conversations.db
- The app can use either Claude (Anthropic) or Perplexity for search queries
</memory>
