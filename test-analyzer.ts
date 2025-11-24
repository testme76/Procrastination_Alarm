import { ScreenAnalyzer } from "./screen-analyzer.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Test the screen analyzer
async function testScreenAnalyzer() {
  console.log("🔍 Testing Screen Analyzer...\n");

  // Load environment variables from .env
  await load({ export: true });

  // Initialize the AI agent
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
    console.log("Please set it in your .env file");
    Deno.exit(1);
  }

  const analyzer = new ScreenAnalyzer(apiKey);

  try {
    console.log("📸 Capturing and analyzing your current screen...");
    console.log("(Make sure you have something visible on screen)\n");

    const result = await analyzer.analyzeCurrentActivity();

    console.log("✅ Analysis Complete!\n");
    console.log("═══════════════════════════════════════");
    console.log(`🚨 Procrastinating: ${result.isProcrastinating ? "YES" : "NO"}`);
    console.log(`📊 Confidence: ${result.confidence}%`);
    console.log(`💡 Reason: ${result.reason}`);
    console.log(`🎯 Suggested Action: ${result.suggestedAction}`);
    console.log("═══════════════════════════════════════");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testScreenAnalyzer();
