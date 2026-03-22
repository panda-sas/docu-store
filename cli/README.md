# docu-store CLI

Command-line client for docu-store. Login via browser OAuth and bulk-upload documents — no service keys required.

## Quick Start

```bash
# Install
cd cli && npm install && npm run build
npm link  # makes `docu` available globally

# Configure (if not using defaults)
docu config set sentinel-url https://sentinel.example.com
docu config set api-url https://api.example.com

# Login
docu login --provider github

# Upload
docu upload ./papers --recursive
```

## Installation

Requires **Node.js 18+**.

```bash
cd cli
npm install
npm run build
npm link
```

After `npm link`, the `docu` command is available globally. To uninstall: `npm unlink -g @docu-store/cli`.

## Commands

### `docu login`

Authenticate via browser-based OAuth. Opens your browser, you log in with your identity provider, and the CLI captures the token automatically.

```bash
docu login                              # GitHub (default)
docu login --provider google            # Google (requires client ID, see below)
docu login --workspace my-lab           # Pre-select workspace
docu login --token <paste> --workspace my-lab  # Headless fallback (no auto-refresh)
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `-p, --provider` | Identity provider (`github`, `google`) | `github` |
| `-w, --workspace` | Workspace slug or ID (skips selection prompt) | — |
| `-t, --token` | Paste an authz token directly (for headless/SSH) | — |
| `--sentinel-url` | Override Sentinel URL for this command | — |

**Google login** requires a Google OAuth client ID:

```bash
docu config set google-client-id YOUR_CLIENT_ID
docu login --provider google
```

The client ID is the same public `NEXT_PUBLIC_GOOGLE_CLIENT_ID` used by the web app.

### `docu upload`

Upload files from a directory to docu-store.

```bash
docu upload ./papers                    # Upload PDFs from directory
docu upload ./papers --recursive        # Include subdirectories
docu upload ./papers -r --resume        # Skip already-uploaded files
docu upload ./papers --dry-run          # List files without uploading
docu upload ./data --glob "*.docx"      # Custom file pattern
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `-r, --recursive` | Scan subdirectories | off |
| `--resume` | Skip files already uploaded (by filename) | off |
| `--dry-run` | List files without uploading | off |
| `--type` | Artifact type | `RESEARCH_ARTICLE` |
| `--visibility` | `workspace` or `private` | `workspace` |
| `--delay` | Seconds between uploads (rate limiting) | `2` |
| `--glob` | File pattern | `*.pdf` |
| `--api-url` | Override API URL | — |

**Output:**
```
Found 47 files in ./papers
  [1/47] OK intro.pdf -> a1b2c3d4 (12 pages, 2.3s)
  [2/47] OK methods.pdf -> e5f6g7h8 (8 pages, 1.8s)
  [3/47] SKIP results.pdf (already uploaded)
  ...
Done. 45 succeeded, 1 failed, 1 skipped.
```

### `docu whoami`

Show current login status.

```bash
docu whoami
```

### `docu logout`

Clear stored credentials.

```bash
docu logout
```

### `docu config`

Manage CLI configuration. Settings are stored in `~/.config/docu-store/config.json`.

```bash
docu config show                        # Show current config
docu config set sentinel-url https://sentinel.example.com
docu config set api-url https://api.example.com
docu config set google-client-id YOUR_CLIENT_ID
```

**Config priority:** CLI flags > environment variables > config file > defaults.

| Setting | Env Variable | Default |
|---------|-------------|---------|
| `sentinel-url` | `DOCU_SENTINEL_URL` | `http://localhost:9003` |
| `api-url` | `DOCU_API_URL` | `http://localhost:8000` |
| `google-client-id` | `DOCU_GOOGLE_CLIENT_ID` | — |

## How Authentication Works

The CLI authenticates the same way as the web frontend — no service keys are distributed to end users.

1. `docu login` opens your browser to the identity provider (GitHub or Google)
2. After login, the token is captured via a local callback server
3. The CLI exchanges this for an authorization token via Sentinel
4. Credentials are stored in `~/.config/docu-store/credentials.json` (mode `0600`)
5. Tokens auto-refresh transparently on each API call

**GitHub tokens** don't expire (only revocable), so you stay logged in indefinitely.
**Google ID tokens** expire in ~1 hour — you'll need to re-login periodically.

## Admin Setup (one-time)

An admin must register the CLI as an allowed origin in Sentinel:

```bash
POST /admin/service-apps
{
  "service_name": "docu-store",
  "name": "docu-cli",
  "allowed_origins": ["docu-cli://localhost"]
}
```

This is a one-time setup. End users never see or need service keys.
