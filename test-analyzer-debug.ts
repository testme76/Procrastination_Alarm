import { ZypherAgent } from "@corespeed/zypher";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Debug test with detailed error logging
async function debugTest() {
  console.log("🔍 Debug Test - Screen Analyzer\n");

  // Load environment variables
  await load({ export: true });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.error("❌ No API key found");
    Deno.exit(1);
  }

  console.log("✅ API key loaded");
  console.log("🖥️  Platform:", Deno.build.os);

  // Step 1: Test screenshot capture
  console.log("\n📸 Step 1: Testing screenshot capture...");
  try {
    const tempPath = `${Deno.env.get("TEMP")}\\procrastination_test_debug.png`;
    console.log("Screenshot path:", tempPath);

    const script = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$screens = [Windows.Forms.Screen]::AllScreens
$top = ($screens.Bounds.Top | Measure-Object -Minimum).Minimum
$left = ($screens.Bounds.Left | Measure-Object -Minimum).Minimum
$width = ($screens.Bounds.Right | Measure-Object -Maximum).Maximum
$height = ($screens.Bounds.Bottom | Measure-Object -Maximum).Maximum
$bounds = [Drawing.Rectangle]::FromLTRB($left, $top, $width, $height)
$bmp = New-Object Drawing.Bitmap $bounds.width, $bounds.height
$graphics = [Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($bounds.Location, [Drawing.Point]::Empty, $bounds.size)
$bmp.Save('${tempPath}')
$graphics.Dispose()
$bmp.Dispose()
Write-Host "Screenshot saved to ${tempPath}"
`;

    const result = await new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script],
    }).output();

    const output = new TextDecoder().decode(result.stdout);
    const errors = new TextDecoder().decode(result.stderr);

    if (output) console.log("PowerShell output:", output);
    if (errors) console.error("PowerShell errors:", errors);

    // Check if file exists
    const stat = await Deno.stat(tempPath);
    console.log(`✅ Screenshot captured (${stat.size} bytes)`);

    // Step 2: Test image reading
    console.log("\n📖 Step 2: Testing image read...");
    const imageData = await Deno.readFile(tempPath);
    console.log(`✅ Image read (${imageData.length} bytes)`);

    // Step 3: Test base64 encoding
    console.log("\n🔤 Step 3: Testing base64 encoding...");
    const base64Image = btoa(String.fromCharCode(...imageData));
    console.log(`✅ Base64 encoded (${base64Image.length} characters)`);

    // Step 4: Test AI analysis
    console.log("\n🤖 Step 4: Testing AI analysis...");
    const agent = new ZypherAgent({
      apiKey,
      model: "claude-3-5-sonnet-20241022",
    });

    const prompt = `You are analyzing a screenshot to detect procrastination.

Look at this screenshot and determine if the user is procrastinating or doing productive work.

Respond ONLY in this exact JSON format (no other text):
{
  "isProcrastinating": boolean,
  "confidence": number (0-100),
  "reason": "brief explanation of what you see",
  "suggestedAction": "what user should do"
}

Guidelines:
- Social media, YouTube, gaming, shopping = procrastination
- Coding, documentation, writing, research = productive
- Consider context: is this work-related or personal entertainment?`;

    console.log("Sending to Claude...");
    const response = await agent.run(prompt, {
      images: [{ data: base64Image, mimeType: "image/png" }],
    });

    console.log("\n✅ AI Response received:");
    console.log(response);

    // Parse response
    const analysis = JSON.parse(response);
    console.log("\n📊 Analysis Result:");
    console.log("═══════════════════════════════════════");
    console.log(`🚨 Procrastinating: ${analysis.isProcrastinating ? "YES" : "NO"}`);
    console.log(`📊 Confidence: ${analysis.confidence}%`);
    console.log(`💡 Reason: ${analysis.reason}`);
    console.log(`🎯 Suggested Action: ${analysis.suggestedAction}`);
    console.log("═══════════════════════════════════════");

    // Cleanup
    await Deno.remove(tempPath);
    console.log("\n🧹 Cleanup complete");

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    console.error("Stack:", error.stack);
  }
}

debugTest();
