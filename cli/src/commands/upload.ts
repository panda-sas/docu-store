import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve as resolvePath } from "node:path";
import { loadConfig } from "../utils/config.js";
import { getAuthCredentials, listArtifactFilenames, uploadFile } from "../api/client.js";
import * as log from "../utils/logger.js";

interface UploadOptions {
  recursive?: boolean;
  resume?: boolean;
  dryRun?: boolean;
  type: string;
  visibility: string;
  delay: string;
  glob?: string;
  apiUrl?: string;
}

/** Recursively find files matching a pattern in a directory. */
function findFiles(dir: string, pattern: string, recursive: boolean): string[] {
  const files: string[] = [];
  const ext = extractExtension(pattern);

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory() && recursive) {
        walk(fullPath);
      } else if (entry.isFile() && matchesPattern(entry.name, ext)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files.sort();
}

/** Extract file extension from a glob like "*.pdf" → ".pdf" */
function extractExtension(pattern: string): string {
  const match = pattern.match(/\*\.(\w+)$/);
  return match ? `.${match[1]}` : ".pdf";
}

/** Check if a filename matches the target extension. */
function matchesPattern(name: string, ext: string): boolean {
  return name.toLowerCase().endsWith(ext.toLowerCase());
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadCommand(
  directory: string,
  opts: UploadOptions,
): Promise<void> {
  const config = loadConfig();
  const apiUrl = (opts.apiUrl || config.api_url).replace(/\/$/, "");
  const delayMs = parseFloat(opts.delay) * 1000;
  const pattern = opts.glob || "*.pdf";

  // Validate directory
  const dir = resolvePath(directory);
  try {
    const stat = statSync(dir);
    if (!stat.isDirectory()) {
      log.error(`${directory} is not a directory`);
      process.exit(1);
    }
  } catch {
    log.error(`Directory not found: ${directory}`);
    process.exit(1);
  }

  // Find files
  const files = findFiles(dir, pattern, !!opts.recursive);
  if (files.length === 0) {
    log.info(`No ${pattern} files found in ${directory}`);
    return;
  }

  log.info(`Found ${files.length} files in ${directory}`);

  // Dry run — just list
  if (opts.dryRun) {
    for (let i = 0; i < files.length; i++) {
      const rel = relative(dir, files[i]);
      const size = formatSize(statSync(files[i]).size);
      console.log(`  [${i + 1}/${files.length}] ${rel} (${size})`);
    }
    console.log(`\nDry run complete. ${files.length} files would be uploaded.`);
    return;
  }

  // Authenticate
  let creds = await getAuthCredentials();

  // Resume — fetch existing filenames
  let skipFilenames = new Set<string>();
  if (opts.resume) {
    log.info("Checking for already-uploaded files...");
    skipFilenames = await listArtifactFilenames(apiUrl, creds);
    log.info(`  Found ${skipFilenames.size} existing artifacts`);
  }

  // Upload loop
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const fileName = filePath.split("/").pop()!;

    if (skipFilenames.has(fileName)) {
      console.log(
        `  [${i + 1}/${files.length}] SKIP ${fileName} (already uploaded)`,
      );
      skipped++;
      continue;
    }

    // Refresh credentials if needed
    try {
      creds = await getAuthCredentials();
    } catch {
      log.error(
        `Auth error. Uploaded ${succeeded} files before failure. Use --resume to continue.`,
      );
      process.exit(1);
    }

    const start = performance.now();
    try {
      const fileData = readFileSync(filePath);
      const result = await uploadFile(
        apiUrl,
        creds,
        filePath,
        fileName,
        fileData,
        opts.type,
        opts.visibility,
      );
      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      const pageCount = Array.isArray(result.pages) ? result.pages.length : "?";
      console.log(
        `  [${i + 1}/${files.length}] OK ${fileName} -> ${result.artifact_id} (${pageCount} pages, ${elapsed}s)`,
      );
      succeeded++;
    } catch (err) {
      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (errorMsg === "AUTH_EXPIRED") {
        // Try one refresh and retry
        try {
          creds = await getAuthCredentials();
          const fileData = readFileSync(filePath);
          const result = await uploadFile(
            apiUrl,
            creds,
            filePath,
            fileName,
            fileData,
            opts.type,
            opts.visibility,
          );
          const retryElapsed = ((performance.now() - start) / 1000).toFixed(1);
          const pageCount = Array.isArray(result.pages)
            ? result.pages.length
            : "?";
          console.log(
            `  [${i + 1}/${files.length}] OK ${fileName} -> ${result.artifact_id} (${pageCount} pages, ${retryElapsed}s)`,
          );
          succeeded++;
          continue;
        } catch {
          log.error(
            `Auth failed. Uploaded ${succeeded} files. Use --resume to continue.`,
          );
          process.exit(1);
        }
      }

      console.log(
        `  [${i + 1}/${files.length}] FAIL ${fileName} (${elapsed}s): ${errorMsg}`,
      );
      errors.push({ name: fileName, error: errorMsg });
      failed++;
    }

    // Delay between uploads (not after last one)
    if (i < files.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // Summary
  console.log(
    `\nDone. ${succeeded} succeeded, ${failed} failed, ${skipped} skipped.`,
  );
  if (errors.length > 0) {
    console.log("\nFailed files:");
    for (const { name, error } of errors) {
      console.log(`  ${name}: ${error}`);
    }
  }
}
