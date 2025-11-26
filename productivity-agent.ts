import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@corespeed/zypher";
import { eachValueFrom } from "rxjs-for-await";
import type { ScreenAnalysis } from "./screen-analyzer.ts";

export interface AgentContext {
  currentActivity: string;
  screenAnalysis?: ScreenAnalysis;
  idleTimeSeconds: number;
  recentInterventions: Intervention[];
  userGoals?: string[];
  timeOfDay: string;
}

export interface Intervention {
  type: "alarm" | "notification" | "gentle_reminder" | "none";
  message: string;
  timestamp: number;
  wasEffective?: boolean;
}

export interface AgentDecision {
  shouldIntervene: boolean;
  intervention: Intervention;
  reasoning: string;
  confidence: number;
}

/**
 * AI Agent that autonomously decides how to help user stay productive
 * Uses Zypher framework for advanced reasoning and decision-making
 */
export class ProductivityAgent {
  private agent: ZypherAgent;
  private interventionHistory: Intervention[] = [];
  private readonly maxHistorySize = 10;

  constructor(apiKey: string) {
    // Initialize will be called separately since it's async
  }

  async initialize(apiKey: string): Promise<void> {
    // Ensure HOME is set for Windows compatibility
    if (!Deno.env.get("HOME") && Deno.env.get("USERPROFILE")) {
      Deno.env.set("HOME", Deno.env.get("USERPROFILE")!);
    }

    const zypherContext = await createZypherContext(Deno.cwd());

    this.agent = new ZypherAgent(
      zypherContext,
      new AnthropicModelProvider({
        apiKey,
      }),
    );
  }

  /**
   * Agent autonomously decides what action to take based on full context
   */
  async decideIntervention(context: AgentContext): Promise<AgentDecision> {
    try {
      const prompt = this.buildDecisionPrompt(context);

      // Run agent task to decide intervention strategy
      const event$ = this.agent.runTask(prompt, "claude-3-5-haiku-20241022");

      let responseText = "";
      for await (const event of eachValueFrom(event$)) {
        if (event.type === "text") {
          responseText += event.content;
        }
      }

      // Parse agent's decision
      const decision = this.parseAgentDecision(responseText);

      // Store intervention in history
      if (decision.shouldIntervene) {
        this.addToHistory(decision.intervention);
      }

      return decision;
    } catch (error) {
      console.error("❌ Agent decision failed:", error);
      return this.getDefaultDecision();
    }
  }

  private buildDecisionPrompt(context: AgentContext): string {
    const historyContext = this.getRecentHistorySummary();

    return `You are a productivity AI agent helping a user stay focused and avoid procrastination.

## Current Situation
- User idle time: ${context.idleTimeSeconds} seconds
- Current time: ${context.timeOfDay}
- Screen analysis: ${context.screenAnalysis ? `
  - Is procrastinating: ${context.screenAnalysis.isProcrastinating}
  - Confidence: ${context.screenAnalysis.confidence}%
  - Activity: ${context.screenAnalysis.reason}
` : "No screen analysis available"}

## Recent Interventions (last ${this.interventionHistory.length})
${historyContext}

## User Profile & Goals
${context.userGoals ? context.userGoals.map(g => `- ${g}`).join('\n') : 'No historical data yet'}

## Your Goals
1. Help the user stay productive and focused
2. Choose the MOST EFFECTIVE intervention type based on context, history, and user's patterns
3. Avoid annoying the user - vary your approach
4. Learn from past interventions (were they effective?)
5. Consider user's productive/unproductive hours when deciding intervention intensity

## Intervention Types Available
- "alarm": Strong alert with sound and popup (use sparingly, only for serious procrastination)
- "notification": Visual notification without sound (gentle but visible)
- "gentle_reminder": Console message only (very subtle)
- "none": No intervention needed

## Decision Factors to Consider
- How long has user been idle?
- What are they currently doing (from screen analysis)?
- What interventions have you used recently? (avoid repetition)
- Time of day (morning vs afternoon vs evening)
- Were recent interventions effective?

## Your Task
Analyze the situation and decide:
1. Should you intervene right now?
2. If yes, what TYPE of intervention is most appropriate?
3. What MESSAGE should you show?
4. How confident are you in this decision?

Respond in this EXACT JSON format (no other text):
{
  "shouldIntervene": boolean,
  "intervention": {
    "type": "alarm" | "notification" | "gentle_reminder" | "none",
    "message": "your message to the user",
    "timestamp": ${Date.now()}
  },
  "reasoning": "explain your thought process in 1-2 sentences",
  "confidence": number (0-100)
}`;
  }

  private parseAgentDecision(response: string): AgentDecision {
    try {
      // Extract JSON from response (agent might include explanatory text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const decision = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (
        typeof decision.shouldIntervene !== "boolean" ||
        !decision.intervention ||
        !decision.reasoning
      ) {
        throw new Error("Invalid decision structure");
      }

      return decision as AgentDecision;
    } catch (error) {
      console.error("Failed to parse agent decision:", error);
      return this.getDefaultDecision();
    }
  }

  private getDefaultDecision(): AgentDecision {
    return {
      shouldIntervene: false,
      intervention: {
        type: "none",
        message: "",
        timestamp: Date.now(),
      },
      reasoning: "Failed to make decision, defaulting to no intervention",
      confidence: 0,
    };
  }

  private addToHistory(intervention: Intervention): void {
    this.interventionHistory.push(intervention);

    // Keep history size manageable
    if (this.interventionHistory.length > this.maxHistorySize) {
      this.interventionHistory.shift();
    }
  }

  private getRecentHistorySummary(): string {
    if (this.interventionHistory.length === 0) {
      return "No previous interventions yet.";
    }

    return this.interventionHistory
      .map((i, idx) => {
        const timeAgo = Math.floor((Date.now() - i.timestamp) / 1000);
        const effectiveness = i.wasEffective !== undefined
          ? i.wasEffective ? "✓ Effective" : "✗ Not effective"
          : "? Unknown";

        return `${idx + 1}. ${i.type} (${timeAgo}s ago) - ${effectiveness}`;
      })
      .join("\n");
  }

  /**
   * Record whether the last intervention was effective
   * Called when user resumes activity after intervention
   */
  recordInterventionEffectiveness(wasEffective: boolean): void {
    if (this.interventionHistory.length > 0) {
      const lastIntervention =
        this.interventionHistory[this.interventionHistory.length - 1];
      lastIntervention.wasEffective = wasEffective;

      console.log(
        `📊 Recorded intervention effectiveness: ${wasEffective ? "✓" : "✗"}`,
      );
    }
  }

  /**
   * Get insights about user's productivity patterns
   */
  async analyzeProductivityPatterns(): Promise<string> {
    if (this.interventionHistory.length < 3) {
      return "Not enough data yet to analyze patterns.";
    }

    const prompt = `You are analyzing a user's productivity patterns based on intervention history.

## Intervention History
${JSON.stringify(this.interventionHistory, null, 2)}

## Your Task
Analyze this data and provide insights:
1. What patterns do you see?
2. What intervention types work best?
3. When does the user tend to procrastinate most?
4. What recommendations would you give?

Provide a concise summary (3-4 sentences).`;

    const event$ = this.agent.runTask(prompt, "claude-3-5-haiku-20241022");

    let analysis = "";
    for await (const event of eachValueFrom(event$)) {
      if (event.type === "text") {
        analysis += event.content;
      }
    }

    return analysis;
  }

  getInterventionHistory(): Intervention[] {
    return [...this.interventionHistory];
  }
}
