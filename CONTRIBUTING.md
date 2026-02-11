# Contributing to Hindsight

Thanks for your interest in contributing to Hindsight! This guide will help you get set up and productive.

## Prerequisites

- **macOS** (required for `screencapture`)
- **Node.js 22.x** (`nvm install 22` or download from [nodejs.org](https://nodejs.org/))
- **Xcode Command Line Tools** (`xcode-select --install`)
- **LM Studio** with a vision-capable model loaded (e.g., `qwen/qwen3-vl-8b`)

## Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/hindsight.git
   cd hindsight
   ```

2. Run the installer:

   ```bash
   ./install.sh
   ```

   This clones the lmstudio-js SDK, installs dependencies for each package, and creates a `.env` file from `.env.example`.

3. Start all services:

   ```bash
   ./hindsight.sh start
   ```

4. Open the web dashboard at `http://localhost:5173` to verify everything works.

## Project Structure

Hindsight is a monorepo with five independent packages (no npm workspaces):

| Package | Description | Module System |
|---------|-------------|---------------|
| `packages/api` | Express REST API + SQLite | ES Modules |
| `packages/image-summarizer` | CLI that sends images to LM Studio vision model | ES Modules |
| `packages/capture-daemon` | Bash script for periodic screenshots | N/A (Bash) |
| `packages/plugin` | LM Studio plugin for querying logs | CommonJS |
| `packages/web` | React dashboard (Vite) | ES Modules |

Each package manages its own `node_modules` and `package.json`. To install and build a single package:

```bash
cd packages/<package-name> && npm install && npm run build
```

## Development Workflow

### Running packages in dev mode

```bash
cd packages/api && npm run dev      # API with hot reload (tsx watch), port 3000
cd packages/web && npm run dev      # Vite dev server, port 5173
cd packages/plugin && npm run dev   # Plugin dev mode (lms dev)
```

### Testing components manually

```bash
# Test the image summarizer
node packages/image-summarizer/dist/index.js /path/to/image.png qwen/qwen3-vl-4b

# Run capture daemon with a short interval (6 seconds)
bash packages/capture-daemon/capture.sh ./data/screenshots/ 0.1

# Preview the production web build
cd packages/web && npm run preview
```

### Service management

```bash
./hindsight.sh start      # Start all services
./hindsight.sh start -v   # Start with verbose API logging
./hindsight.sh stop       # Stop all services
./hindsight.sh status     # Show service status
./hindsight.sh logs       # Tail log files
```

## Making Changes

1. Create a feature branch from `main`:

   ```bash
   git checkout -b my-feature
   ```

2. Make your changes. Keep commits focused and descriptive.

3. Build and verify the affected packages:

   ```bash
   cd packages/<package-name> && npm run build
   ```

4. Test manually by running the services and confirming your changes work end to end.

5. Push your branch and open a pull request against `main`.

## Technical Notes

- **No test suite yet.** Tests are not implemented (placeholder scripts only). Manual testing is the current approach. Adding tests is a welcome contribution!
- **Local SDK dependency.** `image-summarizer` and `web` reference the lmstudio-js SDK via `file:../../lmstudio-js/...` because the npm package has a bug. Don't change these to registry references.
- **Database.** SQLite database (`worklogs.db`) is created at runtime in `packages/api/`. It is not checked into git.
- **PID files.** Services track running processes via `data/*.pid` files.
- **API contract.** Endpoints are defined with ts-rest and Zod schemas in `packages/api/src/contract.ts`. If you add or change endpoints, update the contract first.
- **Privacy.** All data stays local. Do not add external API calls, analytics, or telemetry.

## Code Style

- Follow the existing patterns in each package.
- Use TypeScript for `api`, `image-summarizer`, and `plugin` packages.
- Use JSX for the `web` package (React components).
- Use Zod for all request/response validation in the API.

## Reporting Issues

Open an issue on GitHub with:
- A clear description of the problem or suggestion
- Steps to reproduce (for bugs)
- Your macOS version, Node.js version, and LM Studio version

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
