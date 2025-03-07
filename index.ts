import { highlight, supportsLanguage } from "cli-highlight";
import { default as chalk } from "chalk";
import { streamText } from "ai";
import { objectEntries } from "./util";
import { parseArgs } from "./args";
import { saveMessage, getConversation, getCurrentConversationId } from "./conversation";

async function genStreamResponse({
    apiKey,
    prompt,
    search,
    url,
    conversationId,
}: Payload): Promise<Response> {
    // Store the user's message
    if (conversationId) {
        await saveMessage({
            conversationId,
            role: "user",
            content: prompt,
        });
    }

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

    // Get conversation history if we have a conversation ID
    let fullPrompt = prompt;
    if (conversationId) {
        const conversation = await getConversation(conversationId);
        if (conversation.length > 0) {
            // Format previous messages for Claude
            const history = conversation
                .map(msg => `${msg.role}: ${msg.content}`)
                .join("\n\n");
            fullPrompt = `${history}\n\nuser: ${prompt}\n\nassistant:`;
        }
    }

    const { createAnthropic } = await import("@ai-sdk/anthropic");
    const anthropic = createAnthropic({ apiKey });
    const model = anthropic("claude-3-5-sonnet-latest");
    const result = streamText({ model, prompt: fullPrompt });

    return result.toTextStreamResponse();
}

type Payload = {
    apiKey: string;
    prompt: string;
    search: boolean;
    url: string;
    conversationId?: string;
};

const decoder = new TextDecoder();

const USAGE = `
Usage: ai <prompt>

Example:
ai What is the capital of France?
`;

const NEWLINE = "\n";
const CODE_BLOCK_MD = "```";

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
        description: "Search a specific URL",
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
    new: {
        short: "n",
        description: "Start a new conversation",
        type: "boolean",
        default: false,
        required: false,
    }
} as const;

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

    const highlightedCode = supportsLanguage(language)
        ? highlight(code, { language, theme: { comment: chalk.dim } })
        : code;
    return `${chalk.dim(CODE_BLOCK_MD)}${language ? chalk.dim(language) : ""}
${highlightedCode}
${chalk.dim(CODE_BLOCK_MD)}`;
}

async function processAiCommand(): Promise<void> {
    let apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw "ANTHROPIC_API_KEY must be set as an environment variable";
    }
    const { prompt, options } = parseArgs(
        process.argv.slice(2),
        OPTIONS_CONFIG,
    );

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

    // Handle conversation persistence
    let conversationId: string | undefined;
    if (!options.search) {
        // Only use conversations for Claude, not for search
        if (options.new) {
            // Start a new conversation
            conversationId = await saveMessage({
                role: "system",
                content: "You are Claude, a helpful AI assistant.",
                createNewConversation: true
            });
            console.log(chalk.dim(`Starting new conversation: ${conversationId}`));
        } else {
            // Get or create conversation ID
            conversationId = await getCurrentConversationId();
            if (!conversationId) {
                // No current conversation exists, create one
                conversationId = await saveMessage({
                    role: "system",
                    content: "You are Claude, a helpful AI assistant.",
                    createNewConversation: true
                });
                console.log(chalk.dim(`Starting new conversation: ${conversationId}`));
            } else {
                console.log(chalk.dim(`Continuing conversation: ${conversationId}`));
            }
        }
    }

    const response = await genStreamResponse({
        prompt,
        apiKey,
        search: options.search,
        url: options.url,
        conversationId,
    });

    if (!response.ok) {
        console.error("failed to get response");
        console.error(response.status, response.statusText);
        throw await response.json();
    }

    if (!response.body) {
        throw "no body in response";
    }

    // Capture assistant's response
    const responseText = await printStream(response.body);
    
    // Save assistant response if we're in a conversation
    if (conversationId && !options.search) {
        await saveMessage({
            conversationId,
            role: "assistant",
            content: responseText,
        });
    }
}

async function printStream(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    let buffer = "";
    let fullResponse = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            if (buffer) {
                const highlighted = highlightCode(buffer);
                process.stdout.write(highlighted);
                fullResponse += buffer;
            }
            process.stdout.write("\n");
            break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        fullResponse += chunk;

        // process complete code blocks
        while (buffer.includes(CODE_BLOCK_MD)) {
            const start = buffer.indexOf(CODE_BLOCK_MD);
            const end = buffer.indexOf(
                CODE_BLOCK_MD,
                start + CODE_BLOCK_MD.length,
            );

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
    
    return fullResponse;
}

async function main() {
    return await processAiCommand();
}

await main().catch(console.error);
