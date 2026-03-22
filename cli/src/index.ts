import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { whoamiCommand } from "./commands/whoami.js";
import { configSetCommand, configShowCommand } from "./commands/config.js";
import { uploadCommand } from "./commands/upload.js";

const program = new Command();

program
  .name("docu")
  .description("CLI client for docu-store — login and upload documents")
  .version("0.1.0");

// ── Login ──────────────────────────────────────────────────────────

program
  .command("login")
  .description("Authenticate via browser OAuth")
  .option("-p, --provider <provider>", "Identity provider (github, google)", "github")
  .option("-w, --workspace <workspace>", "Workspace slug or ID")
  .option("-t, --token <token>", "Paste an authz token directly (headless fallback)")
  .option("--sentinel-url <url>", "Override Sentinel URL")
  .action(loginCommand);

// ── Logout ─────────────────────────────────────────────────────────

program
  .command("logout")
  .description("Clear stored credentials")
  .action(logoutCommand);

// ── Whoami ─────────────────────────────────────────────────────────

program
  .command("whoami")
  .description("Show current user and workspace")
  .action(whoamiCommand);

// ── Config ─────────────────────────────────────────────────────────

const configCmd = program
  .command("config")
  .description("Manage CLI configuration");

configCmd
  .command("set <key> <value>")
  .description("Set a config value (sentinel-url, api-url)")
  .action(configSetCommand);

configCmd
  .command("show")
  .description("Show current configuration")
  .action(configShowCommand);

// ── Upload ─────────────────────────────────────────────────────────

program
  .command("upload <directory>")
  .description("Upload files from a directory to docu-store")
  .option("-r, --recursive", "Scan subdirectories recursively")
  .option("--resume", "Skip files already uploaded (match by filename)")
  .option("--dry-run", "List files without uploading")
  .option("--type <type>", "Artifact type", "RESEARCH_ARTICLE")
  .option("--visibility <visibility>", "Visibility (workspace, private)", "workspace")
  .option("--delay <seconds>", "Delay between uploads in seconds", "2")
  .option("--glob <pattern>", "File glob pattern (default: *.pdf)")
  .option("--api-url <url>", "Override API URL")
  .action(uploadCommand);

program.parse();
