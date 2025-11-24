import Anthropic from "npm:@anthropic-ai/sdk@^0.32.1";

export interface ScreenAnalysis {
  isProcrastinating: boolean;
  confidence: number;
  reason: string;
  suggestedAction: string;
}

export class ScreenAnalyzer {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Capture screenshot and analyze it with AI to detect procrastination
   */
  async analyzeCurrentActivity(delaySeconds: number = 0): Promise<ScreenAnalysis> {
    try {
      // Optional delay to allow user to switch windows
      if (delaySeconds > 0) {
        console.log(`⏳ Waiting ${delaySeconds} seconds before screenshot...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }

      // Capture screenshot using PowerShell (Windows)
      if (Deno.build.os === "windows") {
        const tempPath = `${Deno.env.get("TEMP")}\\procrastination_check.png`;

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
`;

        await new Deno.Command("powershell", {
          args: ["-NoProfile", "-Command", script],
        }).output();

        // Read the screenshot
        const imageData = await Deno.readFile(tempPath);
        // Convert to base64 properly for large images
        const base64Image = btoa(
          Array.from(imageData, (byte) => String.fromCharCode(byte)).join("")
        );

        // Analyze with Claude Vision
        const message = await this.anthropic.messages.create({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: base64Image,
                  },
                },
                {
                  type: "text",
                  text: `You are analyzing a screenshot to detect procrastination.

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
- Consider context: is this work-related or personal entertainment?`,
                },
              ],
            },
          ],
        });

        const response =
          message.content[0].type === "text" ? message.content[0].text : "";

        // Cleanup
        try {
          await Deno.remove(tempPath);
        } catch {
          // Ignore cleanup errors
        }

        return this.parseResponse(response);
      }

      // Fallback for non-Windows
      throw new Error("Screenshot analysis only supported on Windows");
    } catch (error) {
      console.error("Screenshot analysis failed:", error);
      return {
        isProcrastinating: false,
        confidence: 0,
        reason: "Analysis failed",
        suggestedAction: "Continue working",
      };
    }
  }

  private parseResponse(response: string): ScreenAnalysis {
    try {
      return JSON.parse(response);
    } catch {
      return {
        isProcrastinating: false,
        confidence: 0,
        reason: "Failed to parse AI response",
        suggestedAction: "Continue working",
      };
    }
  }
}
