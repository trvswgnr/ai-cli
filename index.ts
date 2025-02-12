import { highlight, supportsLanguage } from "cli-highlight";
import chalk from "chalk";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createPerplexity } from "@ai-sdk/perplexity";
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

async function withServer(fn: (url: string) => Promise<void>) {
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
		throw new Error("No available ports found between 3000-3999");
	}

	// Update the endpoint URL with the actual port
	const ENDPOINT_URL = `http://localhost:${port}/gen`;

	await fn(ENDPOINT_URL);

	server.stop(true);
}

async function POST(req: Request) {
	const body: unknown = await req.json();
	const parsed = parsePayload(body);

	if (typeof parsed === "string") {
		return new Response(JSON.stringify({ error: parsed }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	const { apiKey, prompt, search, url } = parsed;

	if (search) {
		const perplexity = createPerplexity({ apiKey });
		const model = perplexity("sonar-pro");
		let p = prompt;
		if (url !== "") {
			p = `${prompt} inurl:${url}`;
		}
		const result = streamText({ model, prompt: p });
		return result.toTextStreamResponse();
	}

	const anthropic = createAnthropic({ apiKey });
	const model = anthropic("claude-3-5-sonnet-latest");
	const result = streamText({ model, prompt });

	return result.toTextStreamResponse();
}

function parsePayload(payload: unknown) {
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

function objectEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
	return Object.entries(obj) as [keyof T, T[keyof T]][];
}

function printHelp(): void {
	console.log(USAGE);
	console.log("\nOptions:");
	for (const [key, config] of objectEntries(OPTIONS_CONFIG)) {
		const shortOption = config.short ? `-${config.short}, ` : "    ";
		const required = config.required ? " (required)" : "";
		console.log(
			`  ${shortOption}--${key.padEnd(20)} ${config.description}${required}`,
		);
	}
}

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

async function processAiCommand(url: string) {
	let apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		console.error("ANTHROPIC_API_KEY must be set as an environment variable");
		process.exit(1);
	}
	const parser = new ArgumentParser(OPTIONS_CONFIG);
	const { prompt, options } = parser.parse(process.argv.slice(2));

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	if (options.version) {
		const packageJson = await import("./package.json");
		const version = packageJson.version;
		console.log(`v${version}`);
		process.exit(0);
	}

	if (!prompt) {
		console.error("Error: prompt is required");
		printHelp();
		process.exit(1);
	}

	if (options.search || options.url !== "") {
		options.search = true;
		apiKey = process.env.PERPLEXITY_API_KEY;
		if (!apiKey) {
			console.error(
				"PERPLEXITY_API_KEY must be set as an environment variable",
			);
			process.exit(1);
		}
	}

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
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
		try {
			const body = await response.json();
			console.error(body);
		} catch (error) {
			console.error(error);
		}
		process.exit(1);
	}

	if (!response.body) {
		console.error("No body");
		process.exit(1);
	}

	const reader = response.body.getReader();
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
			const codeBlock = buffer.slice(start, end + 3);
			process.stdout.write(highlightCode(codeBlock));

			// update buffer
			buffer = buffer.slice(end + 3);
		}

		// output any remaining text
		const lastCodeBlock = buffer.lastIndexOf(CODE_BLOCK_MD);
		if (lastCodeBlock === -1) {
			process.stdout.write(buffer);
			buffer = "";
		}
	}
}

try {
	const url = process.env.AI_ENDPOINT_URL;
	if (!url) {
		// no url provided, start server locally
		await withServer(processAiCommand);
	} else {
		// url provided, use it
		processAiCommand(url);
	}
} catch (error) {
	console.error("Error:", error);
	process.exit(1);
}
