/**
 * Memory system for learning and adapting to user behavior patterns
 * Stores productivity data and provides insights over time
 */

export interface ProductivitySession {
  startTime: number;
  endTime?: number;
  wasProductive: boolean;
  interventionsCount: number;
  activitySummary: string;
}

export interface UserProfile {
  // Productive time windows (hour -> frequency count)
  productiveHoursMap: Record<number, number>; // e.g., {9: 5, 14: 3} = 5 productive sessions at 9am, 3 at 2pm
  unproductiveHoursMap: Record<number, number>;

  // Intervention effectiveness
  interventionEffectivenessRate: number; // 0-1, exponential moving average

  // Stats
  totalSessions: number;
  productiveSessions: number;
  totalInterventions: number;
  lastUpdated: number;
}

export class MemorySystem {
  private readonly memoryFilePath: string;
  private sessions: ProductivitySession[] = [];
  private currentSession?: ProductivitySession;
  private userProfile: UserProfile;

  constructor() {
    // Use project directory for reliability - easy to find and won't get cleaned up
    this.memoryFilePath = "./procrastination_memory.json";

    // Default user profile
    this.userProfile = {
      productiveHoursMap: {},
      unproductiveHoursMap: {},
      interventionEffectivenessRate: 0.5,
      totalSessions: 0,
      productiveSessions: 0,
      totalInterventions: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Load existing memory from disk
   */
  async load(): Promise<void> {
    try {
      const data = await Deno.readTextFile(this.memoryFilePath);
      const memory = JSON.parse(data);

      this.sessions = memory.sessions || [];
      this.userProfile = memory.userProfile || this.userProfile;

      console.log(`📚 Loaded ${this.sessions.length} sessions from memory`);
    } catch {
      console.log("📚 No existing memory found, starting fresh");
    }
  }

  /**
   * Save memory to disk
   */
  async save(): Promise<void> {
    try {
      const memory = {
        sessions: this.sessions,
        userProfile: this.userProfile,
      };

      await Deno.writeTextFile(
        this.memoryFilePath,
        JSON.stringify(memory, null, 2),
      );

      console.log(`💾 Memory saved successfully to ${this.memoryFilePath}`);
    } catch (error) {
      console.error(`❌ Failed to save memory to ${this.memoryFilePath}:`, error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Start a new productivity session
   */
  async startSession(): Promise<void> {
    this.currentSession = {
      startTime: Date.now(),
      wasProductive: true,
      interventionsCount: 0,
      activitySummary: "",
    };

    console.log("🎬 Started new productivity session");

    // Save immediately to create the file
    await this.save();
  }

  /**
   * End current session and analyze it
   */
  async endSession(wasProductive: boolean, summary: string): Promise<void> {
    if (!this.currentSession) {
      console.log("⚠️  No active session to end");
      return;
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.wasProductive = wasProductive;
    this.currentSession.activitySummary = summary;

    // Add to sessions
    this.sessions.push(this.currentSession);

    // Update profile
    this.updateUserProfile(this.currentSession);

    // Cleanup old sessions (keep last 100)
    if (this.sessions.length > 100) {
      this.sessions = this.sessions.slice(-100);
    }

    console.log(`🏁 Ended session (${wasProductive ? "productive" : "unproductive"})`);

    this.currentSession = undefined;

    // Auto-save after each session
    await this.save();
  }

  /**
   * Record an intervention in current session
   */
  async recordIntervention(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.interventionsCount++;
      this.userProfile.totalInterventions++;

      // Auto-save after intervention to prevent data loss
      await this.save();
    }
  }

  /**
   * Update user profile based on completed session
   */
  private updateUserProfile(session: ProductivitySession): void {
    const hour = new Date(session.startTime).getHours();

    // Track productive hours with frequency counts
    if (session.wasProductive) {
      this.userProfile.productiveSessions++;
      this.userProfile.productiveHoursMap[hour] = (this.userProfile.productiveHoursMap[hour] || 0) + 1;
    } else {
      this.userProfile.unproductiveHoursMap[hour] = (this.userProfile.unproductiveHoursMap[hour] || 0) + 1;
    }

    this.userProfile.totalSessions++;
    this.userProfile.lastUpdated = Date.now();
  }

  /**
   * Get user profile for agent decision-making
   */
  getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  /**
   * Get top N most productive hours
   */
  getTopProductiveHours(n: number = 3): number[] {
    const sorted = Object.entries(this.userProfile.productiveHoursMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([hour]) => parseInt(hour));
    return sorted;
  }

  /**
   * Get top N least productive hours
   */
  getTopUnproductiveHours(n: number = 3): number[] {
    const sorted = Object.entries(this.userProfile.unproductiveHoursMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([hour]) => parseInt(hour));
    return sorted;
  }

  /**
   * Get productivity insights
   */
  getInsights(): string {
    if (this.sessions.length === 0) {
      return "No sessions recorded yet. Start working to build your productivity profile!";
    }

    const productivityRate = this.userProfile.totalSessions > 0
      ? (this.userProfile.productiveSessions / this.userProfile.totalSessions * 100).toFixed(1)
      : 0;

    const avgInterventions = this.userProfile.totalSessions > 0
      ? (this.userProfile.totalInterventions / this.userProfile.totalSessions).toFixed(1)
      : 0;

    const topProductiveHours = this.getTopProductiveHours(3);
    const topUnproductiveHours = this.getTopUnproductiveHours(3);

    return `
📊 Productivity Insights
━━━━━━━━━━━━━━━━━━━━━━
Total Sessions: ${this.userProfile.totalSessions}
Productive Rate: ${productivityRate}%
Avg Interventions/Session: ${avgInterventions}
Most Productive Hours: ${topProductiveHours.join(", ") || "Not enough data"}
Least Productive Hours: ${topUnproductiveHours.join(", ") || "Not enough data"}
Intervention Effectiveness: ${(this.userProfile.interventionEffectivenessRate * 100).toFixed(0)}%
    `.trim();
  }

  /**
   * Get sessions from last N days
   */
  getRecentSessions(days: number = 7): ProductivitySession[] {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.sessions.filter((s) => s.startTime > cutoffTime);
  }

  /**
   * Update intervention effectiveness based on user feedback
   */
  updateInterventionEffectiveness(wasEffective: boolean): void {
    // Use exponential moving average
    const alpha = 0.2; // Weight for new data
    const newValue = wasEffective ? 1 : 0;

    this.userProfile.interventionEffectivenessRate =
      alpha * newValue + (1 - alpha) * this.userProfile.interventionEffectivenessRate;

    console.log(
      `📈 Updated effectiveness rate: ${(this.userProfile.interventionEffectivenessRate * 100).toFixed(0)}%`,
    );
  }
}
