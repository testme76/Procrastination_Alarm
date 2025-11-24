import { ScreenAnalyzer } from "./screen-analyzer.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Test with delay - gives you time to switch windows
async function testWithDelay() {
  console.log("🔍 Screen Analyzer Test with Delay\n");

  await load({ export: true });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found");
    Deno.exit(1);
  }

  const analyzer = new ScreenAnalyzer(apiKey);

  console.log("📸 Switch to the window you want to test!");
  console.log("⏰ Screenshot will be taken in 5 seconds...\n");

  try {
    // 5 second delay to switch windows
    const result = await analyzer.analyzeCurrentActivity(5);

    console.log("\n✅ Analysis Complete!\n");
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

testWithDelay();
