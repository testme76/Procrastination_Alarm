import gkm from "https://deno.land/x/gkm/mod.ts";

interface ActivityMonitorConfig {
  idleThresholdSeconds: number;
  onIdleDetected: () => void | Promise<void>;
  onActivityDetected: () => void | Promise<void>;
}

export class ActivityMonitor {
  private lastActivityTime: number = Date.now();
  private idleCheckInterval?: number;
  private config: ActivityMonitorConfig;
  private isIdle: boolean = false;

  constructor(config: ActivityMonitorConfig) {
    this.config = config;
  }

  async start() {
    console.log("🔍 Starting activity monitor...");

    try {
      // Start monitoring idle time
      this.startIdleCheck();

      console.log("✅ Activity listeners registered");

      // Listen for global keyboard and mouse events (async generator)
      for await (const event of gkm()) {
        // Any keyboard or mouse event counts as activity
        this.recordActivity();
      }
    } catch (error) {
      console.error("❌ Failed to start activity monitor:", error);
      console.log("💡 Make sure to run with: deno run --unstable-ffi --allow-all");
      throw error;
    }
  }

  private recordActivity() {
    this.lastActivityTime = Date.now();

    // If was idle, now active
    if (this.isIdle) {
      this.isIdle = false;
      this.config.onActivityDetected();
    }
  }

  private startIdleCheck() {
    // Check every second if user is idle
    this.idleCheckInterval = setInterval(() => {
      const idleSeconds = this.getIdleTimeSeconds();

      if (idleSeconds >= this.config.idleThresholdSeconds && !this.isIdle) {
        this.isIdle = true;
        console.log(`⏰ User idle for ${idleSeconds}s - triggering alarm`);
        this.config.onIdleDetected();
      }
    }, 1000);
  }

  getIdleTimeSeconds(): number {
    return Math.floor((Date.now() - this.lastActivityTime) / 1000);
  }

  isUserIdle(): boolean {
    return this.isIdle;
  }

  stop() {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
    }
    console.log("🛑 Activity monitor stopped");
  }
}
