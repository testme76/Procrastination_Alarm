import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";
import { load } from "jsr:@std/dotenv";

// Load environment variables from .env file
await load({ export: true });

// Helper function to safely get environment variables
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Initialize the agent execution context
// Ensure HOME is set for Windows compatibility
if (!Deno.env.get("HOME") && Deno.env.get("USERPROFILE")) {
  Deno.env.set("HOME", Deno.env.get("USERPROFILE")!);
}
const zypherContext = await createZypherContext(Deno.cwd());

// Create the agent with your preferred LLM provider
const agent = new ZypherAgent(
  zypherContext,
  new AnthropicModelProvider({
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
  }),
);

// Register and connect to an MCP server to give the agent web crawling capabilities
await agent.mcp.registerServer({
  id: "firecrawl",
  type: "command",
  command: {
    command: "npx",
    args: ["-y", "firecrawl-mcp"],
    env: {
      FIRECRAWL_API_KEY: getRequiredEnv("FIRECRAWL_API_KEY"),
    },
  },
});

// Run a task - test with a simple prompt first
const event$ = agent.runTask(
  `What is 2+2?`,
  "claude-3-5-haiku-20241022",
);

// Stream the results in real-time
let currentText = "";
for await (const event of eachValueFrom(event$)) {
  if (event.type === "text") {
    // Accumulate text tokens
    currentText += event.content;
    process.stdout.write(event.content);
  } else if (event.type === "tool_use") {
    console.log(`\n[Using tool: ${event.toolName}]`);
  } else if (event.type === "tool_use_approved") {
    console.log(`[Tool approved: ${event.toolName}]`);
  } else if (event.type === "message" && event.message.role === "assistant") {
    // New assistant message, reset text accumulation
    if (currentText) {
      console.log(); // Add newline after text
      currentText = "";
    }
  }
  // Silently ignore other event types like tool_use_input, message with role "user", etc.
}