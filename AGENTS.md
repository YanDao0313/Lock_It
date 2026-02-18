# Lock It - AI Agent Documentation

## Project Overview

**Lock It** (lock-it) is an Electron-based desktop application designed for automatic screen locking in classroom, lab, or office environments. The application locks the screen during configured time periods and requires a password to unlock.

### Key Features

- **Automatic Screen Locking**: Locks screen based on weekly schedules with multiple time slots per day
- **Password Protection**: Supports fixed 6-digit PIN or TOTP (Time-based One-Time Password) authentication
- **Customizable Lock Screen**: Configurable colors, text, themes, and time display options
- **Security Camera**: Captures photos during unlock attempts for audit purposes
- **System Tray Integration**: Runs in background with tray icon and context menu
- **Setup Wizard**: First-time user configuration with step-by-step guide

### Primary Language

Project code and comments are primarily in **Chinese (简体中文)**.

---

## Technology Stack

| Category          | Technology     | Version  |
| ----------------- | -------------- | -------- |
| Framework         | Electron       | ^39.2.6  |
| UI Library        | React          | ^19.2.1  |
| Build Tool        | electron-vite  | ^5.0.0   |
| Styling           | Tailwind CSS   | ^4.1.18  |
| Language          | TypeScript     | ^5.9.3   |
| Icons             | lucide-react   | ^0.564.0 |
| State/Persistence | electron-store | ^11.0.2  |
| TOTP Support      | otplib         | ^13.3.0  |
| Date Formatting   | date-fns       | ^4.1.0   |

---

## Project Structure

```
lock-it/
├── src/
│   ├── main/
│   │   └── index.ts              # Electron main process (window mgmt, IPC, scheduling)
│   ├── preload/
│   │   ├── index.ts              # Preload script exposing API to renderer
│   │   └── index.d.ts            # TypeScript declarations for window.api
│   └── renderer/
│       ├── index.html            # HTML entry point
│       └── src/
│           ├── main.tsx          # Renderer entry (hash-based routing)
│           ├── App.tsx           # Default demo component (unused)
│           ├── Setup.tsx         # First-time setup wizard (5 steps)
│           ├── Settings.tsx      # Configuration settings page
│           ├── LockScreen.tsx    # Full-screen lock interface
│           ├── components/       # Reusable components
│           └── assets/           # Styles and images
├── resources/
│   └── icon.png                  # Application icon
├── build/                        # Build resources (icons, entitlements)
├── package.json                  # Dependencies and scripts
├── electron-builder.yml          # Electron Builder configuration
├── electron.vite.config.ts       # Vite build configuration
├── tsconfig.json                 # TypeScript project references
├── tsconfig.node.json            # Node/main process TS config
├── tsconfig.web.json             # Renderer/web TS config
└── eslint.config.mjs             # ESLint configuration
```

---

## Architecture

### Process Architecture

The application follows Electron's multi-process architecture:

1. **Main Process** (`src/main/index.ts`)
   - Creates and manages windows (main settings window, lock overlay window)
   - Handles system tray integration
   - Manages configuration storage via `electron-store`
   - Runs schedule checker every 30 seconds to trigger lock
   - Handles IPC communications

2. **Preload Script** (`src/preload/index.ts`)
   - Securely exposes main process APIs to renderer via `contextBridge`
   - Defines `window.api` interface for configuration, password verification, etc.

3. **Renderer Process** (`src/renderer/src/`)
   - React-based UI with hash-based routing
   - Routes: `#setup` → `#settings` → `#lockscreen`

### Page Routing (Hash-based)

| Hash          | Component        | Purpose                         |
| ------------- | ---------------- | ------------------------------- |
| `#setup`      | `Setup.tsx`      | First-time configuration wizard |
| `#settings`   | `Settings.tsx`   | Configuration management        |
| `#lockscreen` | `LockScreen.tsx` | Full-screen lock interface      |

### Data Flow

```
User Action → Renderer Component → window.api → IPC → Main Process → electron-store
                                                        ↓
                                     Lock Trigger → createLockWindow() → LockScreen.tsx
```

---

## Build and Development Commands

### Installation

```bash
yarn
```

### Development

```bash
# Start development server with hot reload
yarn dev
```

### Building

```bash
# Type check and build for production
yarn build

# Build and package for Windows
yarn build:win

# Build and package for macOS
yarn build:mac

# Build and package for Linux
yarn build:linux

# Build unpackaged (for testing)
yarn build:unpack
```

### Code Quality

```bash
# Run ESLint with caching
yarn lint

# Format code with Prettier
yarn format

# Type checking
yarn typecheck          # Check both node and web
yarn typecheck:node     # Check main/preload only
yarn typecheck:web      # Check renderer only
```

---

## Code Style Guidelines

### Prettier Configuration (`.prettierrc.yaml`)

```yaml
singleQuote: true # Use single quotes
semi: false # No semicolons
printWidth: 100 # Line width limit
trailingComma: none # No trailing commas
```

### ESLint Configuration

- Uses `@electron-toolkit/eslint-config-ts` as base
- React hooks and refresh plugins enabled
- Prettier integration for formatting

### Code Organization Patterns

1. **File Structure**: Each major feature is in its own component file
2. **Comments**: Use section headers with `// ====` separators:
   ```typescript
   // ============================================================================
   // 类型定义
   // ============================================================================
   ```
3. **Naming**:
   - Components: PascalCase (`LockScreen.tsx`)
   - Hooks: camelCase with `use` prefix
   - Types/Interfaces: PascalCase

---

## Configuration System

### Stored Configuration (electron-store)

Location: `%appData%/lock-it/config.json`

```typescript
interface AppConfig {
  hasCompletedSetup: boolean
  password: {
    type: 'fixed' | 'totp' | 'both'
    fixedPassword?: string
    totpSecret?: string
  }
  schedule: WeeklySchedule // 7 days with time slots
  style: StyleConfig // Colors, text, theme settings
}
```

### Unlock Records

Photos are saved to: `%appData%/lock-it/unlock-photos/`

Records include timestamp, success/failure, and optional photo data.

---

## Testing

This project does not currently have automated tests configured. Testing is done manually:

1. **Development Mode**: Use `yarn dev` to test features
2. **Build Testing**: Use `yarn build:unpack` to test production build locally
3. **Lock Screen Testing**: Set schedule to current time to trigger lock

---

## Deployment

### Distribution Targets

- **Windows**: NSIS installer (`yarn build:win`)
- **macOS**: DMG (`yarn build:mac`)
- **Linux**: AppImage, Snap, DEB (`yarn build:linux`)

### Auto-Update

Configured in `electron-builder.yml` with generic provider (URL placeholder: `https://example.com/auto-updates`).

### Single Instance

Application enforces single instance via `app.requestSingleInstanceLock()`. Attempting to open a second instance will focus the existing window.

---

## Security Considerations

1. **CSP**: Content Security Policy configured in `index.html`
   - `default-src 'self'`
   - `script-src 'self'`
   - `style-src 'self' 'unsafe-inline'`
   - `img-src 'self' data:`

2. **Context Isolation**: Preload script uses `contextBridge` to expose APIs

3. **Sandbox**: Disabled for main window (`sandbox: false`) to allow Node.js access in renderer

4. **Lock Screen Security**:
   - Kiosk mode enabled during lock
   - Always on top with screen-saver level
   - Window cannot be closed without password
   - Blocks system shortcuts via `optimizer.watchWindowShortcuts()`

5. **Camera Permission**: App requests camera access for unlock photo capture

---

## Important Implementation Details

### Schedule Checking

- Checks every 30 seconds via `setInterval`
- Compares current time against configured time slots
- Only triggers if `autoLockEnabled` is true (disabled after manual unlock)

### Window Management

- **Main Window**: Normal window for settings, hidden to tray on close
- **Lock Window**: Fullscreen, kiosk mode, always on top, no frame

### Password Verification

1. Check fixed password if configured
2. Check TOTP token if configured
3. Either can unlock if `type: 'both'`

### Camera Integration

- Uses `getUserMedia()` API in renderer
- Captures photo on every unlock attempt (success or failure)
- Saves to app data directory with timestamp

---

## Troubleshooting

### Common Issues

1. **Lock screen not appearing**: Check if schedule is enabled and current time is within configured slots
2. **Camera not working**: Check camera permissions in OS settings
3. **Settings not saving**: Ensure write permissions to app data directory

### Debug Mode

Run with DevTools open in development:

- Main process: Use VS Code launch configuration
- Renderer: Press `F12` or use `Ctrl+Shift+I`

---

## Related Documentation

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-vite Guide](https://electron-vite.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev/)
