# PostAI

Advanced API Testing Tool with AI Integration for macOS.

A Postman-like application with enhanced features including:
- AI-powered request generation (Anthropic, DeepSeek)
- MCP (Model Context Protocol) client support
- Visual workflow builder (like n8n)
- Multi-value environment variables with dropdown selection
- Proxy support

## Tech Stack

- **Frontend**: Electron + React + TypeScript + Vite
- **Backend**: Python Django (embedded)
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

### Core Features
- Collections and folders organization
- Request builder with all HTTP methods
- Response viewer with JSON formatting
- Environment variables with multi-value dropdown

### Advanced Features (In Progress)
- [ ] Postman collection import
- [ ] Proxy configuration
- [ ] MCP client for testing MCP servers
- [ ] Visual workflow builder
- [ ] AI chat and request generation
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

## License

MIT
