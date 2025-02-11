const ENDPOINT_URL = "https://artint.vercel.app/api/gen";
const decoder = new TextDecoder();

const USAGE = `
Usage: ai <prompt>

Example:
ai What is the capital of France?
`;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
	console.error("ANTHROPIC_API_KEY must be set as an environment variable");
	process.exit(1);
}

async function main() {
	const prompt = process.argv.slice(2).join(" ").trim();

	if (!prompt) {
		console.error(`prompt is required\n${USAGE}`);
		process.exit(1);
	}

	if (prompt.startsWith("-h")) {
		console.log(USAGE);
		process.exit(0);
	}

	const response = await fetch(ENDPOINT_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ prompt, apiKey }),
	});

	if (!response.ok) {
		console.error("Failed to fetch from", ENDPOINT_URL);
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

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			process.stdout.write("\n");
			break;
		}

		const chunk = decoder.decode(value, { stream: true });
		process.stdout.write(chunk);
	}
}

main();
