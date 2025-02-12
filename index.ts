import { highlight, supportsLanguage } from "cli-highlight";
import { default as chalk } from "chalk";
import { streamText } from "ai";
import type { Server } from "bun";

class ArgumentParser {
	private options: Partial<Options> = {};
	private promptParts: string[] = [];

	constructor(private config: typeof OPTIONS_CONFIG) {
		this.options = this.getDefaultOptions();
	}

	private getDefaultOptions(): Options {
		return objectEntries(this.config).reduce((acc, [key, config]) => {
			acc[key] = config.default as never;
			return acc;
		}, {} as Options);
	}

	private parseOption(arg: string): void {
		const [keyRaw, value] = arg.split("=");
		if (!keyRaw) throw `Invalid option: ${arg}`;

		const key = keyRaw.replace(/^-+/, "");
		const optionEntry = objectEntries(this.config).find(
			([optionKey, config]) => config.short === key || optionKey === key,
		);

		if (!optionEntry) throw `Unknown option \`${key}\``;
		const [optionKey, config] = optionEntry;

		if (config.type === "boolean") {
			this.options[optionKey] = (
				value === undefined ? true : value.toLowerCase() === "true"
			) as never;
		} else {
			if (!value && config.required) {
				throw `Option \`${key}\` requires a value`;
			}
			this.options[optionKey] = value as never;
		}
	}

	parse(args: string[]): ParsedArgs {
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (!arg) continue;

			if (arg.startsWith("-")) {
				this.parseOption(arg);
			} else {
				this.promptParts.push(arg);
			}
		}

		// validate required options
		for (const [key, config] of objectEntries(this.config)) {
			if (config.required && !this.options[key]) {
				throw `Required option '${key}' is missing`;
			}
		}

		return {
			prompt: this.promptParts.join(" "),
			options: this.options as Options,
		};
	}
}

async function withServerRunning(
	fn: (url: string) => Promise<void>,
): Promise<void> {
	// Try ports starting from 3000 until we find an available one
	let port = 3000;
	let server: Server | undefined;

	while (port < 4000) {
		try {
			server = Bun.serve({
				port,
				async fetch(req) {
					const url = new URL(req.url);

					if (url.pathname === "/gen" && req.method === "POST") {
						return POST(req);
					}

					return new Response("Not found", { status: 404 });
				},
			});
			break;
		} catch (error) {
			port++;
		}
	}

	if (typeof server === "undefined") {
		throw "no available ports found between 3000-3999";
	}

	// Update the endpoint URL with the actual port
	const ENDPOINT_URL = `http://localhost:${port}/gen`;

	await fn(ENDPOINT_URL).finally(() => server.stop(true));
}

async function POST(req: Request) {
	const body: unknown = await req.json();
	const parsed = parsePayload(body);

	if (typeof parsed === "string") {
		return new Response(JSON.stringify({ error: parsed }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const { apiKey, prompt, search, url } = parsed;

	if (search) {
		const { createPerplexity } = await import("@ai-sdk/perplexity");
		const perplexity = createPerplexity({ apiKey });
		const model = perplexity("sonar-pro");
		let p = prompt;
		if (url !== "") {
			p = `${prompt} inurl:${url}`;
		}
		const result = streamText({ model, prompt: p });
		return result.toTextStreamResponse();
	}

	const { createAnthropic } = await import("@ai-sdk/anthropic");
	const anthropic = createAnthropic({ apiKey });
	const model = anthropic("claude-3-5-sonnet-latest");
	const result = streamText({ model, prompt });

	return result.toTextStreamResponse();
}

type Payload = {
	apiKey: string;
	prompt: string;
	search: boolean;
	url: string;
};

function parsePayload(payload: unknown): string | Payload {
	if (typeof payload !== "object" || payload === null) {
		return "malformed request body";
	}

	if (!("apiKey" in payload)) {
		return "missing api key";
	}

	if (
		typeof payload.apiKey !== "string" ||
		(!payload.apiKey.startsWith("sk-ant-") &&
			!payload.apiKey.startsWith("pplx-"))
	) {
		return "malformed api key";
	}

	if (!("prompt" in payload)) {
		return "missing prompt";
	}

	if (typeof payload.prompt !== "string") {
		return "malformed prompt";
	}

	if (!("search" in payload) || !("url" in payload)) {
		return "missing search and url in payload";
	}

	if (typeof payload.search !== "boolean") {
		return "malformed search";
	}

	if (typeof payload.url !== "string") {
		return "malformed url";
	}

	return {
		apiKey: payload.apiKey,
		prompt: payload.prompt,
		search: payload.search,
		url: payload.url,
	};
}

const decoder = new TextDecoder();

const USAGE = `
Usage: ai <prompt>

Example:
ai What is the capital of France?
`;

const NEWLINE = "\n";
const CODE_BLOCK_MD = "```";

type OptionType = "boolean" | "string";

interface OptionConfig<T> {
	short?: string;
	description: string;
	type: T;
	default: T extends "boolean" ? boolean : string;
	required?: boolean;
}

type OptionsConfig = {
	[K in string]: OptionConfig<OptionType>;
};

const OPTIONS_CONFIG = {
	help: {
		short: "h",
		description: "Show help message",
		type: "boolean",
		default: false,
		required: false,
	},
	url: {
		short: "u",
		description: "Custom API endpoint URL",
		type: "string",
		default: "",
		required: false,
	},
	search: {
		short: "s",
		description: "Search the web",
		type: "boolean",
		default: false,
		required: false,
	},
	version: {
		short: "v",
		description: "Show version number",
		type: "boolean",
		default: false,
		required: false,
	},
} as const satisfies OptionsConfig;

type InferOptionType<T> = T extends "boolean" ? boolean : string;

type Options = {
	-readonly [K in keyof typeof OPTIONS_CONFIG]: InferOptionType<
		(typeof OPTIONS_CONFIG)[K]["type"]
	>;
};

interface ParsedArgs {
	prompt: string;
	options: Options;
}

function objectEntries<K extends string, V>(obj: Record<K, V>): [K, V][] {
	return Object.entries(obj) as [K, V][];
}

const HELP_MESSAGE = (() => {
	let s = USAGE;
	s += "\nOptions:";
	for (const [key, config] of objectEntries(OPTIONS_CONFIG)) {
		const shortOption = config.short ? `-${config.short}, ` : "    ";
		const required = config.required ? " (required)" : "";

		s += `  ${shortOption}--${key.padEnd(20)} ${config.description}${required}`;
	}
	return s;
})();

function highlightCode(text: string): string {
	if (!text.startsWith(CODE_BLOCK_MD)) return text;

	const lines = text.split(NEWLINE);
	const firstLine = lines[0];
	if (!firstLine) return text;
	const language = firstLine.length > 3 ? firstLine.slice(3) : "";
	const code = lines.slice(1, -1).join(NEWLINE);

	return `\n${chalk.dim(CODE_BLOCK_MD)}${language ? chalk.dim(language) : ""}
${
	supportsLanguage(language)
		? highlight(code, { language, theme: { comment: chalk.dim } })
		: `UNSUPPORTED LANGUAGE: ${language}\n${code}`
}
${chalk.dim(CODE_BLOCK_MD)}\n`;
}

async function processAiCommand(url: string): Promise<void> {
	let apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw "ANTHROPIC_API_KEY must be set as an environment variable";
	}
	const parser = new ArgumentParser(OPTIONS_CONFIG);
	const { prompt, options } = parser.parse(process.argv.slice(2));

	if (options.help) {
		console.log(HELP_MESSAGE);
		return;
	}

	if (options.version) {
		const packageJson = await import("./package.json");
		const version = packageJson.version;
		console.log(`v${version}`);
		return;
	}

	if (!prompt) {
		throw `Error: prompt is required\n${HELP_MESSAGE}`;
	}

	if (options.search || options.url !== "") {
		options.search = true;
		apiKey = process.env.PERPLEXITY_API_KEY;
		if (!apiKey) {
			throw "PERPLEXITY_API_KEY must be set as an environment variable";
		}
	}

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			prompt,
			apiKey,
			search: options.search,
			url: options.url,
		}),
	});

	if (!response.ok) {
		console.error("failed to fetch from", url);
		console.error(response.status, response.statusText);
		throw await response.json();
	}

	if (!response.body) {
		throw "no body in response";
	}

	await printStream(response.body);
}

async function printStream(stream: ReadableStream<Uint8Array>): Promise<void> {
	const reader = stream.getReader();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			if (buffer) {
				process.stdout.write(highlightCode(buffer));
			}
			process.stdout.write("\n");
			break;
		}

		const chunk = decoder.decode(value, { stream: true });
		buffer += chunk;

		// process complete code blocks
		while (buffer.includes(CODE_BLOCK_MD)) {
			const start = buffer.indexOf(CODE_BLOCK_MD);
			const end = buffer.indexOf(CODE_BLOCK_MD, start + CODE_BLOCK_MD.length);

			if (end === -1) break; // incomplete code block

			// output text before code block
			process.stdout.write(buffer.slice(0, start));

			// extract and highlight code block
			const codeBlock = buffer.slice(start, end + CODE_BLOCK_MD.length);
			process.stdout.write(highlightCode(codeBlock));

			// update buffer
			buffer = buffer.slice(end + CODE_BLOCK_MD.length);
		}

		// output any remaining text
		const lastCodeBlock = buffer.lastIndexOf(CODE_BLOCK_MD);
		if (lastCodeBlock === -1) {
			process.stdout.write(buffer);
			buffer = "";
		}
	}
}

async function main() {
	const url = process.env.AI_ENDPOINT_URL;
	if (url) {
		// remote url provided, use it directly
		return await processAiCommand(url);
	}
	// no url provided, start temporary server locally
	return await withServerRunning(processAiCommand);
}

await main().catch(console.error);
