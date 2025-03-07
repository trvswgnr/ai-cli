# ai-cli

A command-line interface for interacting with AI models. Features persistent conversations that continue across CLI invocations.

## Installation

To install dependencies:

```bash
bun install
```

To build and install:
```bash
bun build ./index.ts --compile --outfile ai && mv ./ai ~/.bun/bin/ai
```

## Usage

Basic usage:

```bash
ai <your question here>
```

### Options

- `-h, --help`: Show help message
- `-v, --version`: Show version number
- `-s, --search`: Search the web (uses Perplexity)
- `-u, --url`: Search a specific URL
- `-n, --new`: Start a new conversation

### Conversation Persistence

By default, the CLI maintains a persistent conversation across invocations. Your conversation history is stored locally in `~/.ai-cli/conversations.db` using SQLite. 

To start a new conversation:

```bash
ai --new "Hello, I'd like to start a new conversation"
```

## Development

To run in development mode:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.