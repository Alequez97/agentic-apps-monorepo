import { spawn } from "child_process";
import * as logger from "../utils/logger.js";

/**
 * Default timeout for command execution (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Maximum output length returned to the LLM (characters)
 */
const MAX_OUTPUT_LENGTH = 8_000;

/**
 * Shell metacharacters that, if present in a command, indicate an injection
 * attempt.  Since spawn runs with `shell: true`, every one of these can be
 * used to chain or redirect additional commands.
 *
 *   ;       command separator
 *   &&      conditional AND chaining
 *   ||      conditional OR chaining
 *   |       pipe  (LLM receives full output so pipes are unnecessary)
 *   >  >>   stdout/stderr redirection
 *   <       stdin redirection
 *   `       backtick sub-shell
 *   $(      sub-shell substitution
 *   ${      variable expansion
 *   \n \r   newline-injected commands
 */
const SHELL_INJECTION_PATTERN = /[;&|><`$\n\r]/;

/**
 * Prefixes of commands that are safe to execute.
 * Includes test-runner commands and package installation commands.
 */
const SAFE_COMMAND_PREFIXES = [
  // Package configuration
  "npm pkg set",
  // Package installation
  "npm install",
  "npm ci",
  "yarn install",
  "yarn add",
  "pnpm install",
  "pnpm add",
  // Test runners
  "npm test",
  "npm run test",
  "npx jest",
  "npx vitest",
  "npx mocha",
  "npx jasmine",
  "yarn test",
  "yarn run test",
  "pnpm test",
  "pnpm run test",
  "pytest",
  "python -m pytest",
  "python3 -m pytest",
  "pip install",
  "pip3 install",
  "go test",
  "cargo test",
  "dotnet test",
  "mvn test",
  "gradle test",
  "rake test",
  "bundle exec rspec",
  "bundle install",
  "php artisan test",
  "vendor/bin/phpunit",
  "composer install",
];

/**
 * Tool definitions for LLM — command execution
 */
export const COMMAND_TOOLS = [
  {
    name: "execute_command",
    description:
      "Execute a safe command in the project root directory. Supported commands: (1) Git commands for context: 'git diff', 'git log', 'git status', 'git show', 'git blame', 'git branch'. (2) Package/test commands: install dependencies (e.g., 'npm install mongodb-memory-server --save-dev'), configure package.json (e.g., 'npm pkg set scripts.test=jest'), or run tests (e.g., 'npx jest path/to/test.js'). Use git commands to understand what changed, file history, and current state. Use package commands to set up and run tests.",
    parameters: {
      command: {
        type: "string",
        description:
          "The command to run in the project root (e.g., 'git diff HEAD~1', 'npx jest src/auth/login.test.js --no-coverage', 'npm install --save-dev').",
      },
    },
    required: ["command"],
  },
];

/**
 * Executor for command tools
 */
export class CommandToolExecutor {
  /**
   * @param {string} workingDirectory - Directory to run commands in (project root)
   * @param {Object} [options]
   * @param {number} [options.timeoutMs] - Command timeout in milliseconds
   * @param {string[]} [options.additionalAllowedPrefixes] - Extra safe command prefixes
   */
  constructor(workingDirectory, options = {}) {
    this.workingDirectory = workingDirectory;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.allowedPrefixes = [
      ...SAFE_COMMAND_PREFIXES,
      ...(options.additionalAllowedPrefixes || []),
    ];
  }

  /**
   * Execute a tool call
   * @param {string} toolName
   * @param {Object} args
   * @returns {Promise<string>}
   */
  async executeTool(toolName, args) {
    if (toolName === "execute_command") {
      return this.executeCommand(args.command);
    }
    throw new Error(`Unknown command tool: ${toolName}`);
  }

  /**
   * Run a shell command safely
   * @param {string} command - The command string to run
   * @returns {Promise<string>} Combined stdout + stderr output
   */
  async executeCommand(command) {
    if (!command || typeof command !== "string") {
      return "Error: command must be a non-empty string";
    }

    const trimmed = command.trim();

    if (!this._isSafeCommand(trimmed)) {
      const allowed = this.allowedPrefixes.join(", ");
      return `Error: Command not allowed for security reasons. Only safe commands are permitted (git, package managers, test runners). Allowed prefixes: ${allowed}`;
    }

    logger.info(`Executing command: ${trimmed}`, {
      component: "CommandToolExecutor",
      cwd: this.workingDirectory,
    });

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const child = spawn(trimmed, {
        cwd: this.workingDirectory,
        shell: true,
        env: { ...process.env },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        resolve(
          `Error: Command timed out after ${this.timeoutMs / 1000}s\n\nPartial stdout:\n${stdout}\n\nPartial stderr:\n${stderr}`,
        );
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (timedOut) return;
        clearTimeout(timer);

        const exitLabel =
          code === 0 ? "✅ PASSED" : `❌ FAILED (exit code ${code})`;
        const combined = `${exitLabel}\n\nstdout:\n${stdout}\nstderr:\n${stderr}`;

        if (combined.length > MAX_OUTPUT_LENGTH) {
          resolve(
            combined.slice(0, MAX_OUTPUT_LENGTH) +
              `\n\n[Output truncated — ${combined.length - MAX_OUTPUT_LENGTH} chars omitted]`,
          );
        } else {
          resolve(combined);
        }
      });

      child.on("error", (err) => {
        if (timedOut) return;
        clearTimeout(timer);
        logger.error(`Command spawn error: ${err.message}`, {
          component: "CommandToolExecutor",
          command: trimmed,
        });
        resolve(`Error: Failed to start command — ${err.message}`);
      });
    });
  }

  /**
   * Check whether a command starts with a known-safe prefix and contains no
   * shell metacharacters that could be used for command injection.
   * @private
   */
  _isSafeCommand(command) {
    // Block shell injection via metacharacters regardless of prefix.
    // The spawn call uses shell:true, so all of these are dangerous.
    if (SHELL_INJECTION_PATTERN.test(command)) {
      return false;
    }
    const lower = command.toLowerCase();
    return this.allowedPrefixes.some((prefix) =>
      lower.startsWith(prefix.toLowerCase()),
    );
  }
}
