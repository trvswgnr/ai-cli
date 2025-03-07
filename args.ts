import { objectEntries } from "./util";

type OptionType = "boolean" | "string";

interface OptionConfig<T> {
    short?: string;
    description: string;
    type: T;
    default: T extends "boolean" ? boolean : string;
    required?: boolean;
}

type InferOptionType<T> = T extends "boolean" ? boolean : string;

type Options<T extends OptionsConfig> = {
    -readonly [K in keyof T]: InferOptionType<T[K]["type"]>;
};

interface ParsedArgs<T extends OptionsConfig> {
    prompt: string;
    options: Options<T>;
}

type OptionsConfig = Record<string, OptionConfig<OptionType>>;

class ArgumentParser {
    private options: Options<OptionsConfig>;
    private promptParts: string[];
    private config: OptionsConfig;

    constructor(config: OptionsConfig) {
        this.config = config;
        this.options = this.getDefaultOptions();
        this.promptParts = [];
    }

    private getDefaultOptions(): Options<OptionsConfig> {
        const options = {} as Options<OptionsConfig>;
        for (const [key, config] of objectEntries(this.config)) {
            options[key] = config.default;
        }
        return options;
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

    parse(args: string[]): ParsedArgs<OptionsConfig> {
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
            options: this.options,
        };
    }
}

export function parseArgs<T extends OptionsConfig>(
    args: string[],
    config: T,
): ParsedArgs<T> {
    const parser = new ArgumentParser(config);
    return parser.parse(args) as ParsedArgs<T>;
}
