# Procrastination Alarm

An AI-powered productivity tool that monitors your computer activity system-wide and alerts you when you're procrastinating. Works across all applications on Windows to help keep you focused.

## Features

- **Global Activity Monitoring**: Tracks keyboard and mouse activity system-wide (not just in one app)
- **Smart AI Detection**: Uses Claude AI to analyze screen content and detect procrastination
- **Instant Alerts**: System beep and Windows notifications when procrastination is detected
- **Auto-Dismissal**: Alerts disappear automatically when you resume productive activity
- **Configurable**: Customize idle thresholds and detection sensitivity

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
deno task monitor
```

This command runs with all necessary permissions (`--unstable-ffi --allow-all`).

## Usage Modes

### Basic Mode (Activity Monitoring Only)

Monitors keyboard/mouse activity and alerts on idle time:

```typescript
// In procrastination-detector.ts
const config: AlarmConfig = {
  idleThresholdSeconds: 5,      // Alert after 5 seconds idle
  enableAIAnalysis: false,      // No AI - just idle detection
  soundEnabled: true,           // Play beep sound
};
```

### AI Mode (Smart Detection)

Uses AI to analyze screen content for procrastination:

```typescript
// In procrastination-detector.ts
const config: AlarmConfig = {
  idleThresholdSeconds: 5,      // Still monitors idle time
  enableAIAnalysis: true,       // Enable AI screen analysis
  soundEnabled: true,           // Play beep sound
};
```

**Note**: AI mode requires your `ANTHROPIC_API_KEY` in `.env`.

## How It Works

1. **Global Event Listener**: Uses `deno-gkm` to capture keyboard/mouse events across ALL applications
2. **Idle Detection**: Tracks time since last activity
3. **AI Analysis** (optional): Takes screenshots and uses Claude to determine if you're procrastinating
4. **Alert System**: Triggers console warnings, system beeps, and Windows toast notifications
5. **Auto-Recovery**: Dismisses alerts when activity resumes

## Configuration Options

Edit [`procrastination-detector.ts`](./procrastination-detector.ts) to customize:

```typescript
interface AlarmConfig {
  idleThresholdSeconds: number;    // Seconds before triggering alarm (default: 5)
  enableAIAnalysis: boolean;       // Use AI to detect procrastination (default: false)
  soundEnabled: boolean;           // Play alert sounds (default: true)
}
```

### Recommended Settings

- **For strict productivity**: `idleThresholdSeconds: 5`, `enableAIAnalysis: true`
- **For gentle reminders**: `idleThresholdSeconds: 30`, `enableAIAnalysis: false`
- **For testing**: `idleThresholdSeconds: 3`, check `test-analyzer.ts`

## Testing

Test the screen analyzer independently:

```bash
deno run --unstable-ffi --allow-all test-analyzer.ts
```

This captures a screenshot and shows AI analysis results.

## Project Structure

```
├── activity-monitor.ts           # Global keyboard/mouse tracking
├── screen-analyzer.ts            # AI-powered screen analysis
├── procrastination-detector.ts   # Main application logic
├── generate-alarm-sound.ts       # Sound generation utility
├── main.ts                       # Alternative entry point
├── test-analyzer.ts              # Test harness for AI
├── test-analyzer-debug.ts        # Debug version with verbose output
├── test-with-delay.ts            # Delayed test for setup
└── deno.json                     # Deno configuration & tasks
```

## Troubleshooting

### "Permission denied" errors

Make sure you're running with proper permissions:
```bash
deno run --unstable-ffi --allow-all procrastination-detector.ts
```

Or use the task command:
```bash
deno task monitor
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
