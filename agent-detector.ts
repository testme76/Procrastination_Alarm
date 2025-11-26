import { load } from "jsr:@std/dotenv";
import { ActivityMonitor } from "./activity-monitor.ts";
import { ScreenAnalyzer } from "./screen-analyzer.ts";
import { ProductivityAgent, type AgentContext } from "./productivity-agent.ts";
import { MemorySystem } from "./memory-system.ts";

// Load environment variables
await load({ export: true });

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

interface AgentConfig {
  idleThresholdSeconds: number;
  enableAIAnalysis: boolean;
  soundEnabled: boolean;
  screenCheckIntervalSeconds: number;
  enableMemory: boolean; // Learn from past behavior
}

/**
 * Agent-based Procrastination Detector
 * Uses AI to autonomously decide how to help user stay productive
 */
class AgentBasedDetector {
  private activityMonitor: ActivityMonitor;
  private screenAnalyzer?: ScreenAnalyzer;
  private productivityAgent!: ProductivityAgent;
  private memorySystem?: MemorySystem;
  private config: AgentConfig;
  private alarmActive: boolean = false;
  private screenCheckInterval?: number;
  private lastInterventionTime: number = 0;
  private sessionStartTime: number = Date.now(); // Track when monitoring started

  constructor(config: AgentConfig) {
    this.config = config;

    this.activityMonitor = new ActivityMonitor({
      idleThresholdSeconds: config.idleThresholdSeconds,
      onIdleDetected: () => this.handleIdleDetected(),
      onActivityDetected: () => this.handleActivityDetected(),
    });
  }

  async initialize() {
    console.log("🤖 Initializing Agent-Based Procrastination Detector...");

    try {
      const apiKey = getRequiredEnv("ANTHROPIC_API_KEY");

      // Initialize AI Agent (core decision maker)
      this.productivityAgent = new ProductivityAgent(apiKey);
      await this.productivityAgent.initialize(apiKey);
      console.log("✅ Productivity Agent initialized");

      // Initialize screen analyzer if enabled
      if (this.config.enableAIAnalysis) {
        this.screenAnalyzer = new ScreenAnalyzer(apiKey);
        console.log("✅ Screen Analyzer initialized");
      }

      // Initialize memory system if enabled
      if (this.config.enableMemory) {
        this.memorySystem = new MemorySystem();
        await this.memorySystem.load();
        await this.memorySystem.startSession();
        console.log("✅ Memory System initialized");
      }

      console.log("✅ Agent-Based Detector ready");
    } catch (error) {
      console.error("❌ Initialization failed:", error);
      console.error("💡 Make sure:");
      console.error("   - ANTHROPIC_API_KEY is set in .env file");
      console.error("   - You have write permissions in the project directory");
      console.error("   - You're running with: deno task agent");
      throw error;
    }
  }

  async start() {
    try {
      console.log("\n" + "=".repeat(60));
      console.log("🚀 AGENT-BASED PROCRASTINATION DETECTOR STARTED");
      console.log("=".repeat(60));
      console.log(`⏱️  Idle threshold: ${this.config.idleThresholdSeconds} seconds`);
      console.log(`🤖 AI screen analysis: ${this.config.enableAIAnalysis ? "ON" : "OFF"}`);
      console.log(`🧠 Memory & Learning: ${this.config.enableMemory ? "ON" : "OFF"}`);
      console.log(`🔍 Agent check interval: ${this.config.screenCheckIntervalSeconds} seconds`);
      console.log(`🔊 Sound alerts: ${this.config.soundEnabled ? "ON" : "OFF"}`);
      console.log("=".repeat(60) + "\n");

      console.log("🧠 Agent Mode: I will autonomously decide how to help you stay productive");
      console.log("   - Analyzing context (time, activity, patterns)");
      console.log("   - Choosing intervention types (alarm, notification, gentle reminder)");
      console.log("   - Learning from effectiveness over time\n");

      // Start periodic agent-based checks
      this.startPeriodicAgentCheck();

      // Start activity monitoring (non-blocking if it fails)
      await this.activityMonitor.start();

      console.log("👀 Agent monitoring active... (Press Ctrl+C to stop)\n");

      // Keep process running even if activity monitor failed
      await new Promise(() => {}); // Never resolves - keeps process alive
    } catch (error) {
      console.error("❌ Failed to start agent:", error);
      console.error("💡 Make sure you're running with: deno run --unstable-ffi --allow-all agent-detector.ts");
      throw error;
    }
  }

  private startPeriodicAgentCheck() {
    console.log(`🤖 Agent will analyze situation every ${this.config.screenCheckIntervalSeconds}s`);

    // Check immediately, then periodically
    this.runAgentCheck();

    this.screenCheckInterval = setInterval(() => {
      this.runAgentCheck();
    }, this.config.screenCheckIntervalSeconds * 1000);
  }

  /**
   * Core agent loop - agent decides what to do
   */
  private async runAgentCheck() {
    try {
      // Build context for agent
      const context = await this.buildAgentContext();

      console.log("\n🤖 Agent analyzing situation...");
      console.log(`   Current state: ${context.idleTimeSeconds}s idle, ${context.timeOfDay}`);
      if (context.idleTimeSeconds > 0) {
        console.log(`   ⏱️  No screen changes for ${context.idleTimeSeconds}s`);
      }

      // Let agent decide what to do
      const decision = await this.productivityAgent.decideIntervention(context);

      console.log(`\n🧠 Agent Decision:`);
      console.log(`   Should intervene: ${decision.shouldIntervene ? "YES" : "NO"}`);
      console.log(`   Intervention type: ${decision.intervention.type}`);
      console.log(`   Confidence: ${decision.confidence}%`);
      console.log(`   Reasoning: ${decision.reasoning}`);

      // Execute agent's decision
      if (decision.shouldIntervene && decision.intervention.type !== "none") {
        await this.executeIntervention(decision.intervention);

        // Record in memory (now auto-saves)
        if (this.memorySystem) {
          await this.memorySystem.recordIntervention();
        }
      }
    } catch (error) {
      console.error("❌ Agent check failed:", error);
    }
  }

  private async buildAgentContext(): Promise<AgentContext> {
    const idleTimeSeconds = this.activityMonitor.getIdleTimeSeconds();
    const now = new Date();
    const timeOfDay = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Get screen analysis if enabled
    let screenAnalysis;
    if (this.screenAnalyzer && this.config.enableAIAnalysis) {
      screenAnalysis = await this.screenAnalyzer.analyzeCurrentActivity();
    }

    // Get recent interventions from agent
    const recentInterventions = this.productivityAgent.getInterventionHistory();

    // Get full user profile from memory if available
    const userGoals = this.memorySystem
      ? this.buildUserGoalsFromProfile(this.memorySystem.getUserProfile())
      : undefined;

    return {
      currentActivity: screenAnalysis?.reason || "Unknown",
      screenAnalysis,
      idleTimeSeconds,
      recentInterventions,
      userGoals,
      timeOfDay,
    };
  }

  private buildUserGoalsFromProfile(profile: any): string[] {
    const goals: string[] = [];

    // Add productivity rate goal
    const productivityRate = (profile.interventionEffectivenessRate * 100).toFixed(0);
    goals.push(`Maintain ${productivityRate}% intervention effectiveness`);

    // Add productive hours context
    if (this.memorySystem) {
      const topProductiveHours = this.memorySystem.getTopProductiveHours(3);
      const topUnproductiveHours = this.memorySystem.getTopUnproductiveHours(3);

      if (topProductiveHours.length > 0) {
        goals.push(`User is most productive at: ${topProductiveHours.join(", ")}:00`);
      }
      if (topUnproductiveHours.length > 0) {
        goals.push(`User struggles most at: ${topUnproductiveHours.join(", ")}:00`);
      }
    }

    // Add session stats
    if (profile.totalSessions > 0) {
      const productivityRate = ((profile.productiveSessions / profile.totalSessions) * 100).toFixed(0);
      goals.push(`Overall productivity: ${productivityRate}% (${profile.productiveSessions}/${profile.totalSessions} sessions)`);
    }

    return goals;
  }

  private async executeIntervention(intervention: any) {
    this.alarmActive = true;
    this.lastInterventionTime = Date.now();

    switch (intervention.type) {
      case "alarm":
        this.triggerStrongAlarm(intervention.message);
        break;

      case "notification":
        this.triggerNotification(intervention.message);
        break;

      case "gentle_reminder":
        this.triggerGentleReminder(intervention.message);
        break;
    }
  }

  private triggerStrongAlarm(message: string) {
    console.log("\n" + "🚨".repeat(30));
    console.log("🚨 STRONG ALARM TRIGGERED! 🚨");
    console.log("🚨".repeat(30));
    console.log(`\n📢 ${message}\n`);

    if (this.config.soundEnabled) {
      this.playAlarmSound();
    }

    this.showNotificationPopup(message);
  }

  private triggerNotification(message: string) {
    console.log("\n" + "⚠️ ".repeat(20));
    console.log(`⚠️  NOTIFICATION: ${message}`);
    console.log("⚠️ ".repeat(20) + "\n");

    this.showNotificationPopup(message);
  }

  private triggerGentleReminder(message: string) {
    console.log(`\n💡 Gentle reminder: ${message}\n`);
  }

  private async handleIdleDetected() {
    // Agent will handle this in periodic checks
    // This is just for logging when activity monitoring works
    if (!this.alarmActive) {
      console.log(`\n⏰ Idle detected (${this.activityMonitor.getIdleTimeSeconds()}s)`);
    }
  }

  private handleActivityDetected() {
    // Only called if activity monitoring is working
    if (this.alarmActive) {
      console.log("\n✅ Activity resumed - dismissing alarm");

      // Calculate time to resume
      const timeToResume = Math.floor((Date.now() - this.lastInterventionTime) / 1000);

      // Record effectiveness in agent
      const wasEffective = timeToResume < 60; // If resumed within 1 minute, intervention was effective
      this.productivityAgent.recordInterventionEffectiveness(wasEffective);

      // Update memory
      if (this.memorySystem) {
        this.memorySystem.updateInterventionEffectiveness(wasEffective);
      }

      this.alarmActive = false;
    }
  }

  private playAlarmSound() {
    if (Deno.build.os === "windows") {
      try {
        const beepSequence = [
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

  private showNotificationPopup(message: string) {
    if (Deno.build.os === "windows") {
      try {
        const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$textNodes.Item(0).AppendChild($template.CreateTextNode("🤖 Productivity Agent")) | Out-Null
$textNodes.Item(1).AppendChild($template.CreateTextNode("${message}")) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Productivity Agent")
$notifier.Show($toast)
`;
        new Deno.Command("powershell", {
          args: ["-NoProfile", "-Command", script],
        }).spawn();
      } catch {
        console.log("🔇 Could not show notification");
      }
    }
  }

  async stop() {
    console.log("🔴 Stopping activity monitor...");
    this.activityMonitor.stop();

    if (this.screenCheckInterval) {
      clearInterval(this.screenCheckInterval);
    }

    // Save session data
    if (this.memorySystem) {
      console.log("💾 Ending and saving session...");
      await this.memorySystem.endSession(true, "Session ended by user");
      console.log(this.memorySystem.getInsights());
    } else {
      console.log("⚠️  No memory system found");
    }

    // Get productivity insights from agent
    console.log("\n📊 Agent Productivity Analysis:");
    const analysis = await this.productivityAgent.analyzeProductivityPatterns();
    console.log(analysis);

    console.log("\n👋 Agent-Based Detector stopped");
  }
}

// Main execution
if (import.meta.main) {
  const config: AgentConfig = {
    idleThresholdSeconds: 5,
    enableAIAnalysis: true,
    soundEnabled: true,
    screenCheckIntervalSeconds: 10, // Agent checks every 10 seconds
    enableMemory: true, // Enable learning
  };

  const detector = new AgentBasedDetector(config);

  // Handle graceful shutdown - MUST be registered BEFORE start()
  Deno.addSignalListener("SIGINT", async () => {
    console.log("\n\n🛑 Ctrl+C detected - Stopping agent...");
    try {
      await detector.stop();
    } catch (error) {
      console.error("Error during shutdown:", error);
    }
    console.log("✅ Shutdown complete");
    Deno.exit(0);
  });

  try {
    await detector.initialize();
    await detector.start();
  } catch (error) {
    console.error("❌ Error:", error);
    Deno.exit(1);
  }
}

export { AgentBasedDetector };
