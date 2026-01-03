# PostAI

Advanced API Testing Tool with AI Integration for macOS.

A Postman-like application with powerful features:
- 🤖 AI-powered request generation (Anthropic, OpenAI, DeepSeek)
- 🔌 MCP (Model Context Protocol) client for testing MCP servers
- 🔀 Visual workflow builder for automated request sequences
- 🌍 Multi-value environment variables with dropdown selection
- 📦 Workspaces for project organization
- 📥 Postman environment import

## Installation

### Download

Get the latest release from [GitHub Releases](https://github.com/GrigoriLab/postai/releases).

- **PostAI-x.x.x-arm64.dmg** - For Apple Silicon Macs (M1/M2/M3)

### First Launch (Important)

Since the app is not yet code-signed, macOS will show a "damaged" warning. To fix this, run the following command in Terminal after copying PostAI to your Applications folder:

```bash
xattr -cr /Applications/PostAI.app
```

Then open PostAI normally. This only needs to be done once after installation.

## Tech Stack

- **Frontend**: Electron + React + TypeScript + Vite
- **Backend**: Python Django (bundled via PyInstaller)
- **UI**: Tailwind CSS, React Flow, Monaco Editor
- **Storage**: SQLite

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Setup

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Setup Python backend:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   cd ..
   ```

3. **Run in development mode:**
   ```bash
   # Terminal 1: Start Django backend
   cd backend
   source .venv/bin/activate
   python manage.py runserver 8765

   # Terminal 2: Start Electron + React
   npm run electron:dev
   ```

   Or use the combined command (requires backend setup first):
   ```bash
   npm run electron:dev
   ```

### Building for macOS

```bash
npm run electron:build
```

The built app will be in the `release` directory.

## Project Structure

```
postai/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point
│   ├── preload.ts     # IPC bridge
│   └── services/      # Django manager, etc.
├── src/               # React frontend
│   ├── components/    # UI components
│   ├── stores/        # Zustand state
│   ├── api/          # API client
│   └── types/        # TypeScript types
├── backend/           # Django backend
│   ├── collections_app/
│   ├── environments_app/
│   ├── requests_app/
│   ├── workflows_app/
│   ├── mcp_app/
│   ├── ai_app/
│   ├── proxy_app/
│   └── sync_app/
└── resources/         # Icons, entitlements
```

## Features

### Request Builder
- All HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
- Headers, query params, and body editor
- Multiple body types (JSON, form-data, raw, binary)
- Authentication (Basic, Bearer, API Key, OAuth2)
- Response viewer with syntax highlighting
- Code snippet generation (cURL, Python, JavaScript, etc.)

### Collections & Organization
- Collections and folders for organizing requests
- Workspaces for separating projects
- Deep search across collections, folders, and requests
- Drag and drop organization

### Environment Variables
- Multi-value variables with dropdown selection
- Link groups to switch related variables together
- Variable highlighting in URL and editors
- Import from Postman

### Visual Workflow Builder
- Drag-and-drop workflow canvas
- HTTP request nodes with environment selection
- Condition nodes for branching logic
- Variable nodes for data transformation
- Delay nodes for timing control
- Real-time execution with step-by-step results

### AI Integration
- AI-powered request generation from natural language
- Chat assistant for API help
- Multiple providers (Anthropic, OpenAI, DeepSeek)

### MCP Client
- Connect to MCP (Model Context Protocol) servers
- Browse and execute MCP tools
- Test your MCP server implementations

### Planned Features
- [ ] Postman collection import
- [ ] Proxy configuration
- [ ] Request history
- [ ] Cloud sync

## API Endpoints

```
GET/POST   /api/v1/collections/
GET/POST   /api/v1/environments/
POST       /api/v1/requests/execute/
GET        /api/v1/health/
```

## Environment Variables (Multi-Value)

PostAI supports multiple values per environment variable. Instead of editing variables each time, you can:

1. Add multiple values to a variable (e.g., multiple usernames)
2. Use a dropdown to quickly switch between values
3. The selected value is used when resolving `{{variable}}` placeholders

## Code Signing & Notarization (For Developers)

To distribute the app without the "damaged" warning, you need to code sign and notarize it with Apple.

### Prerequisites

1. **Apple Developer Account** ($99/year) - Sign up at https://developer.apple.com
2. **Developer ID Application certificate** - Create in Apple Developer portal
3. **App-Specific Password** - Generate at https://appleid.apple.com

### Setup

1. **Export your certificate** from Keychain Access as a `.p12` file

2. **Base64 encode the certificate:**
   ```bash
   base64 -i Certificates.p12 | pbcopy
   ```

3. **Add GitHub Secrets** (Settings → Secrets → Actions):
   - `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate
   - `APPLE_CERTIFICATE_PASSWORD` - Password for the .p12 file
   - `APPLE_ID` - Your Apple ID email
   - `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password
   - `APPLE_TEAM_ID` - Your 10-character Team ID

4. **Update `electron-builder.yml`:**
   ```yaml
   mac:
     hardenedRuntime: true
     gatekeeperAssess: false
     entitlements: resources/entitlements.mac.plist
     entitlementsInherit: resources/entitlements.mac.plist

   notarize:
     teamId: ${env.APPLE_TEAM_ID}
   ```

5. **Update GitHub workflow** to import the certificate and set environment variables before building.

## License

MIT
