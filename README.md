# Procrastination Alarm

An AI-powered productivity tool that monitors your computer activity system-wide and alerts you when you're procrastinating.

## Features

- **Global Activity Monitoring**: Tracks keyboard and mouse activity system-wide
- **Smart Detection**: Uses AI to analyze whether you're working or procrastinating
- **Works Everywhere**: Monitors activity across all applications
- **Sound Alerts**: System beep and notifications when procrastination is detected

## Quick Start

For system-wide activity monitoring:

```bash
deno task monitor
```

For AI-powered smart detection (requires `.env` with `ANTHROPIC_API_KEY`):

```bash
deno task monitor-ai
```

## How It Works

1. Uses `deno-gkm` to listen to global keyboard/mouse events system-wide
2. Tracks idle time across ALL applications
3. Optionally uses AI to analyze screen content for procrastination
4. Triggers console alerts, system beeps, and Windows notifications when procrastination detected
5. Auto-dismisses when you resume activity

## Configuration

Edit `procrastination-detector.ts` to customize:

```typescript
const config: AlarmConfig = {
  idleThresholdSeconds: 5,     // Seconds before alarm
  enableAIAnalysis: false,       // Use AI detection
  soundEnabled: true,            // Play sound alerts
};
```

## Requirements

- **Windows** (currently only Windows supported)
- **Deno 2.0+** with unstable FFI features
- **Permissions**: `--unstable-ffi --allow-all`
- **Optional**: `.env` file with `ANTHROPIC_API_KEY` for AI mode

## Project Structure

```
activity-monitor.ts           - Global keyboard/mouse activity tracking
screen-analyzer.ts            - AI-powered screen content analysis
procrastination-detector.ts   - Main system monitor
```
