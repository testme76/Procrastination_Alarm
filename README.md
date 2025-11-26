# Procrastination Alarm

An **AI Agent-powered** productivity tool that monitors your computer activity and **autonomously decides** how to help you stay focused. Uses advanced AI reasoning to choose the right intervention at the right time, and learns from your behavior patterns over time.

## Features

### 🤖 AI Agent Mode (NEW!)
- **Autonomous Decision-Making**: AI agent analyzes context and decides the best intervention strategy
- **Adaptive Interventions**: Chooses between strong alarms, gentle notifications, or subtle reminders based on situation
- **Context-Aware**: Considers time of day, recent interventions, and your activity patterns
- **Learning & Memory**: Tracks what works for you and improves over time
- **Pattern Recognition**: Identifies your productive hours and procrastination triggers

### Classic Features
- **Global Activity Monitoring**: Tracks keyboard and mouse activity system-wide (not just in one app)
- **Smart AI Detection**: Uses Claude AI to analyze screen content and detect procrastination
- **Multiple Alert Types**: Strong alarms, notifications, or gentle reminders - agent decides
- **Auto-Dismissal**: Alerts disappear when you resume productive activity
- **Productivity Insights**: Get analytics on your work patterns and effectiveness

## Prerequisites

Before you start, make sure you have:

1. **Windows OS** (currently Windows-only due to `deno-gkm` library)
2. **Deno 2.0 or higher** installed ([download here](https://deno.land/))
3. **Anthropic API Key** for AI detection (get one at [console.anthropic.com](https://console.anthropic.com))

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/testme76/Procrastination_Alarm.git
cd Procrastination_Alarm
```

### 2. Configure Your API Key

Create a `.env` file in the project root:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

**Important**: Never commit your `.env` file! It's already in `.gitignore`.

### 3. Run the Application

```bash
deno task agent
```

This runs with all necessary permissions (`--unstable-ffi --allow-all`).

## Usage

### 🤖 AI Agent Mode

The AI agent autonomously manages your productivity by:

1. **Analyzing Context**: Every 10 seconds, the agent evaluates:
   - Your current activity (via screen analysis)
   - How long you've been idle
   - Time of day and productivity patterns
   - Recent interventions and their effectiveness

2. **Making Decisions**: The agent uses Claude Sonnet to reason about:
   - Should I intervene right now?
   - What type of intervention is most appropriate?
   - What message will be most effective?

3. **Learning Over Time**: The agent tracks:
   - Which interventions work best for you
   - Your productive vs. unproductive hours
   - Patterns in your procrastination behavior

**Run the agent:**
```bash
deno task agent
```

The agent will display its reasoning process in real-time, showing you how it makes decisions.

## How It Works

1. **Global Event Listener**: Uses `deno-gkm` to capture keyboard/mouse events across ALL applications
2. **Idle Detection**: Tracks time since last activity
3. **AI Analysis** (optional): Takes screenshots and uses Claude to determine if you're procrastinating
4. **Alert System**: Triggers console warnings, system beeps, and Windows toast notifications
5. **Auto-Recovery**: Dismisses alerts when activity resumes

## Configuration Options

Edit [`agent-detector.ts`](./agent-detector.ts) to customize:

```typescript
interface AgentConfig {
  idleThresholdSeconds: number;           // Seconds before considering user idle (default: 5)
  enableAIAnalysis: boolean;              // Use AI screen analysis (default: true)
  soundEnabled: boolean;                  // Play alert sounds (default: true)
  screenCheckIntervalSeconds: number;     // How often agent analyzes (default: 10)
  enableMemory: boolean;                  // Enable learning from patterns (default: true)
}
```

### Recommended Settings

- **For strict productivity**: `idleThresholdSeconds: 5`, `screenCheckIntervalSeconds: 10`
- **For gentle reminders**: `idleThresholdSeconds: 30`, `screenCheckIntervalSeconds: 30`
- **To disable learning**: `enableMemory: false`

## Project Structure

```
├── agent-detector.ts             # Main entry point - AI agent coordinator
├── productivity-agent.ts         # Core AI agent decision-making logic
├── memory-system.ts              # Learning and pattern tracking system
├── activity-monitor.ts           # Global keyboard/mouse activity tracking
├── screen-analyzer.ts            # AI-powered screen content analysis
└── deno.json                     # Deno configuration & tasks
```

## Architecture

The system uses an **autonomous AI agent** approach:

- **Proactive**: Analyzes situation and decides best action every 10 seconds
- **Context-aware**: Considers time, patterns, recent interventions, productive hours
- **Adaptive**: Learns what works for you and improves over time
- **Multi-strategy**: Can choose between alarm, notification, or gentle reminder
- **Memory-based**: Tracks productive hours, effectiveness rates, and session history

The agent uses the **Zypher framework** to give Claude the ability to reason about your productivity context and make intelligent decisions.

## Troubleshooting

### "Permission denied" errors

Make sure you're running with proper permissions:
```bash
deno run --unstable-ffi --allow-all agent-detector.ts
# or
deno task agent
```

### "Failed to start activity monitor"

The `deno-gkm` library requires Windows and FFI support. Ensure:
- You're on Windows OS
- Using Deno 2.0+
- Running with `--unstable-ffi` flag

### AI analysis not working

Check that:
1. `.env` file exists with valid `ANTHROPIC_API_KEY`
2. `enableAIAnalysis: true` in config
3. You have internet connectivity
4. Your API key has available credits

### Notifications not appearing

Windows notifications require:
- Windows 10/11
- Notifications enabled in Windows Settings
- Focus Assist not blocking notifications

## Privacy & Security

- **Screenshots**: Only taken when AI analysis is enabled
- **Data**: Screenshots are sent to Anthropic's API for analysis
- **Storage**: No screenshots are saved locally
- **API Key**: Keep your `.env` file private and never commit it

## Contributing

Feel free to open issues or submit pull requests on [GitHub](https://github.com/testme76/Procrastination_Alarm).

## License

MIT License - feel free to use and modify as needed.

## Credits

Built with:
- [Deno](https://deno.land/) - Modern TypeScript runtime
- [deno-gkm](https://deno.land/x/gkm) - Global keyboard/mouse events
- [Anthropic Claude](https://anthropic.com) - AI-powered analysis
- [Zypher](https://jsr.io/@corespeed/zypher) - MCP & AI utilities
