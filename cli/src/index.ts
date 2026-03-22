import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { whoamiCommand } from "./commands/whoami.js";
import { configSetCommand, configShowCommand } from "./commands/config.js";
import { uploadCommand } from "./commands/upload.js";
import { listCommand } from "./commands/list.js";
import { searchCommand } from "./commands/search.js";
import { statusCommand } from "./commands/status.js";
import { summaryCommand } from "./commands/summary.js";
import { exportCommand } from "./commands/export.js";
import { deleteCommand } from "./commands/delete.js";

const program = new Command();

program
  .name("docu")
  .description("CLI client for docu-store — manage and search documents")
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
  .command("upload <path>")
  .description("Upload a file or directory to docu-store")
  .option("-r, --recursive", "Scan subdirectories recursively")
  .option("--resume", "Skip files already uploaded (match by filename)")
  .option("--dry-run", "List files without uploading")
  .option("--type <type>", "Artifact type", "RESEARCH_ARTICLE")
  .option("--visibility <visibility>", "Visibility (workspace, private)", "workspace")
  .option("--delay <seconds>", "Delay between uploads in seconds", "2")
  .option("--glob <pattern>", "File glob pattern (default: *.pdf)")
  .option("--api-url <url>", "Override API URL")
  .action(uploadCommand);

// ── List ──────────────────────────────────────────────────────────

program
  .command("list")
  .alias("ls")
  .description("List documents in the workspace")
  .option("-l, --limit <n>", "Number of documents to show", "20")
  .option("-s, --sort <field>", "Sort by (date, name)", "date")
  .option("--json", "Output as JSON")
  .option("--api-url <url>", "Override API URL")
  .action(listCommand);

// ── Search ────────────────────────────────────────────────────────

program
  .command("search <query>")
  .description("Search documents by text or semantic similarity")
  .option("-l, --limit <n>", "Max results", "5")
  .option("-t, --type <type>", "Result type (all, summary)", "all")
  .option("--json", "Output as JSON")
  .option("--api-url <url>", "Override API URL")
  .action(searchCommand);

// ── Status ────────────────────────────────────────────────────────

program
  .command("status [filename]")
  .description("Show processing status of documents")
  .option("--id <artifact-id>", "Look up by artifact ID instead of filename")
  .option("-l, --limit <n>", "Number of recent documents (when no filename)", "10")
  .option("--json", "Output as JSON")
  .option("--api-url <url>", "Override API URL")
  .action(statusCommand);

// ── Summary ───────────────────────────────────────────────────────

program
  .command("summary <filename>")
  .description("Show AI-generated summary of a document")
  .option("--id <artifact-id>", "Look up by artifact ID instead of filename")
  .option("--json", "Output as JSON")
  .option("--api-url <url>", "Override API URL")
  .action(summaryCommand);

// ── Export ─────────────────────────────────────────────────────────

program
  .command("export <filename>")
  .description("Download the original document")
  .option("--id <artifact-id>", "Look up by artifact ID instead of filename")
  .option("-o, --out <dir>", "Output directory (default: current directory)")
  .option("--api-url <url>", "Override API URL")
  .action(exportCommand);

// ── Delete ────────────────────────────────────────────────────────

program
  .command("delete <filename>")
  .alias("rm")
  .description("Delete a document")
  .option("--id <artifact-id>", "Look up by artifact ID instead of filename")
  .option("-f, --force", "Skip confirmation prompt")
  .option("--api-url <url>", "Override API URL")
  .action(deleteCommand);

program.parse();
