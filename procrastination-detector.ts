import { load } from "jsr:@std/dotenv";
import { ActivityMonitor } from "./activity-monitor.ts";
import { ScreenAnalyzer } from "./screen-analyzer.ts";

// Load environment variables
await load({ export: true });

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

interface AlarmConfig {
  idleThresholdSeconds: number;
  enableAIAnalysis: boolean;
  soundEnabled: boolean;
  screenCheckIntervalSeconds: number; // How often to check screen content
}

class ProcrastinationDetector {
  private activityMonitor: ActivityMonitor;
  private screenAnalyzer?: ScreenAnalyzer;
  private config: AlarmConfig;
  private alarmActive: boolean = false;
  private screenCheckInterval?: number;

  constructor(config: AlarmConfig) {
    this.config = config;

    this.activityMonitor = new ActivityMonitor({
      idleThresholdSeconds: config.idleThresholdSeconds,
      onIdleDetected: () => this.handleIdleDetected(),
      onActivityDetected: () => this.handleActivityDetected(),
    });
  }

  async initialize() {
    console.log("🎯 Initializing Procrastination Detector...");

    if (this.config.enableAIAnalysis) {
      // Initialize AI agent for advanced analysis
      const apiKey = getRequiredEnv("ANTHROPIC_API_KEY");
      this.screenAnalyzer = new ScreenAnalyzer(apiKey);
      console.log("🤖 AI analysis enabled");
    }

    console.log("✅ Procrastination Detector initialized");
  }

  async start() {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 PROCRASTINATION DETECTOR STARTED");
    console.log("=".repeat(50));
    console.log(`⏱️  Idle threshold: ${this.config.idleThresholdSeconds} seconds`);
    console.log(`🤖 AI analysis: ${this.config.enableAIAnalysis ? "ON" : "OFF"}`);
    console.log(`🔍 Screen check interval: ${this.config.screenCheckIntervalSeconds} seconds`);
    console.log(`🔊 Sound alerts: ${this.config.soundEnabled ? "ON" : "OFF"}`);
    console.log("=".repeat(50) + "\n");

    // Start periodic screen analysis if AI is enabled
    if (this.config.enableAIAnalysis && this.screenAnalyzer) {
      this.startPeriodicScreenCheck();
    }

    await this.activityMonitor.start();

    // Keep the process running
    console.log("👀 Monitoring your activity... (Press Ctrl+C to stop)\n");
  }

  private startPeriodicScreenCheck() {
    console.log(`📸 Starting periodic screen checks every ${this.config.screenCheckIntervalSeconds}s`);

    // Check immediately, then periodically
    this.checkScreen();

    this.screenCheckInterval = setInterval(() => {
      this.checkScreen();
    }, this.config.screenCheckIntervalSeconds * 1000);
  }

  private async checkScreen() {
    // Skip if no analyzer available
    if (!this.screenAnalyzer) return;

    console.log("\n🔍 Analyzing screen content...");

    const analysis = await this.screenAnalyzer.analyzeCurrentActivity();

    console.log(`📊 Analysis Result:`);
    console.log(`   - Procrastinating: ${analysis.isProcrastinating ? "YES" : "NO"}`);
    console.log(`   - Confidence: ${analysis.confidence}%`);
    console.log(`   - Reason: ${analysis.reason}`);
    console.log(`   - Suggestion: ${analysis.suggestedAction}`);

    if (analysis.isProcrastinating && analysis.confidence > 60) {
      this.triggerAlarm(analysis.reason);
    } else {
      console.log("✅ User appears to be working - continuing monitoring\n");
    }
  }

  private async handleIdleDetected() {
    if (this.alarmActive) return;

    console.log("\n⚠️  IDLE DETECTED!");

    // Always trigger alarm when idle
    this.triggerAlarm("No activity detected - you are idle");
  }

  private handleActivityDetected() {
    if (this.alarmActive) {
      console.log("\n✅ Activity detected - dismissing alarm");
      this.dismissAlarm();
    }
  }

  private triggerAlarm(reason: string) {
    this.alarmActive = true;

    console.log("\n" + "🚨".repeat(25));
    console.log("🚨 PROCRASTINATION ALARM TRIGGERED! 🚨");
    console.log("🚨".repeat(25));
    console.log(`\n📢 Reason: ${reason}`);
    console.log("💪 GET BACK TO WORK!\n");
    console.log("Move your mouse or press a key to dismiss...\n");

    if (this.config.soundEnabled) {
      this.playAlarmSound();
    }

    // Show popup notification
    this.showNotificationPopup(reason);
  }

  private dismissAlarm() {
    this.alarmActive = false;
    console.log("✅ Alarm dismissed - keep up the good work!\n");
  }

  private playAlarmSound() {
    // On Windows, play rapid beeps
    if (Deno.build.os === "windows") {
      try {
        // Multiple rapid beeps - same frequency
        const beepSequence = [
          "[console]::beep(1000,200)",
          "[console]::beep(1000,200)",
          "[console]::beep(1000,200)",
          "[console]::beep(1000,200)",
          "[console]::beep(1000,200)",
          "[console]::beep(1000,200)",
          "[console]::beep(1000,200)",
        ];

        new Deno.Command("powershell", {
          args: ["-c", beepSequence.join("; ")],
        }).spawn();
      } catch {
        console.log("🔇 Could not play sound");
      }
    }
  }

  private showNotificationPopup(reason: string) {
    // On Windows, show notification once
    if (Deno.build.os === "windows") {
      try {
        const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$textNodes.Item(0).AppendChild($template.CreateTextNode("⚠️ PROCRASTINATION DETECTED!")) | Out-Null
$textNodes.Item(1).AppendChild($template.CreateTextNode("GET BACK TO WORK! ${reason}")) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Procrastination Alarm")
$notifier.Show($toast)
`;
        // Show notification once
        new Deno.Command("powershell", {
          args: ["-NoProfile", "-Command", script],
        }).spawn();
      } catch (error) {
        console.log("🔇 Could not show notification popup");
      }
    }
  }

  stop() {
    this.activityMonitor.stop();

    if (this.screenCheckInterval) {
      clearInterval(this.screenCheckInterval);
    }

    console.log("\n👋 Procrastination Detector stopped");
  }
}

// Main execution
if (import.meta.main) {
  const config: AlarmConfig = {
    idleThresholdSeconds: 5, // 5 seconds of no activity
    enableAIAnalysis: true, // AI-powered procrastination detection
    soundEnabled: true,
    screenCheckIntervalSeconds: 5, // Check screen every 5 seconds
  };

  const detector = new ProcrastinationDetector(config);

  try {
    await detector.initialize();
    await detector.start();

    // Handle graceful shutdown
    Deno.addSignalListener("SIGINT", () => {
      detector.stop();
      Deno.exit(0);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    Deno.exit(1);
  }
}

export { ProcrastinationDetector };
