import { highlight, supportsLanguage, type Theme } from "cli-highlight";
import chalk from "chalk";

const ENDPOINT_URL = "https://artint.vercel.app/api/gen";
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

		// Validate required options
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

async function main() {
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

	if (options.search) {
		apiKey = process.env.PERPLEXITY_API_KEY;
		if (!apiKey) {
			console.error("PERPLEXITY_API_KEY must be set as an environment variable");
			process.exit(1);
		}
	}

	const response = await fetch(ENDPOINT_URL, {
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
		console.error("failed to fetch from", ENDPOINT_URL);
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

		// Process complete code blocks
		while (buffer.includes(CODE_BLOCK_MD)) {
			const start = buffer.indexOf(CODE_BLOCK_MD);
			const end = buffer.indexOf(CODE_BLOCK_MD, start + CODE_BLOCK_MD.length);

			if (end === -1) break; // incomplete code block

			// Output text before code block
			process.stdout.write(buffer.slice(0, start));

			// Extract and highlight code block
			const codeBlock = buffer.slice(start, end + 3);
			process.stdout.write(highlightCode(codeBlock));

			// Update buffer
			buffer = buffer.slice(end + 3);
		}

		// Output any remaining text
		const lastCodeBlock = buffer.lastIndexOf(CODE_BLOCK_MD);
		if (lastCodeBlock === -1) {
			process.stdout.write(buffer);
			buffer = "";
		}
	}
}

try {
	await main();
} catch (error) {
	console.error("Error:", error);
	process.exit(1);
}
