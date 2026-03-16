import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  TOOL_ERROR_CODES,
  TOOL_ERROR_TYPES,
} from "../constants/tool-error-codes.js";

const execAsync = promisify(exec);

/**
 * Default allowed output directory prefix.
 * Apps can override this via the FileToolExecutor constructor.
 */
const DEFAULT_OUTPUT_PREFIX = ".code-analysis";

/**
 * Used in static tool descriptions — reflects the default prefix.
 * When an app uses a different prefix the system prompt provides the
 * authoritative path; enforcement is runtime-only via allowedOutputPrefix.
 */
const ANALYSIS_OUTPUT_DIR = DEFAULT_OUTPUT_PREFIX;

/**
 * File system tools that LLM can use during codebase analysis
 */

/**
 * Tool definitions for LLM
 */
export const FILE_TOOLS = [
  {
    name: "read_file",
    description:
      "Read the complete content of a file with line numbers. Every line is prefixed with its 1-based line number (e.g. '  42: code here'). Use the line numbers when calling replace_lines. The path should be relative to the project root.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to the file from project root (e.g., 'src/app.js')",
      },
    },
    required: ["path"],
  },
  {
    name: "list_directory",
    description:
      "List all files and subdirectories in a given directory. Use this to explore the project structure. Returns file names with indicators for directories (ends with /).",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to directory from project root (e.g., 'src' or 'src/components'). Use '.' for project root.",
      },
      recursive: {
        type: "boolean",
        description:
          "If true, list files recursively in subdirectories. Default is false.",
      },
    },
    required: ["path"],
  },
  {
    name: "search_files",
    description:
      "Search for files matching a pattern (glob-like). Use this to find specific types of files or files with certain names across the project.",
    parameters: {
      pattern: {
        type: "string",
        description:
          "Search pattern (e.g., '*.js' for all JS files, 'test/**/*.spec.js' for test files)",
      },
      directory: {
        type: "string",
        description:
          "Starting directory for search, relative to project root. Default is '.' (project root).",
      },
    },
    required: ["pattern"],
  },
  {
    name: "write_file",
    description: `Write content to a file. By default, only paths in '${ANALYSIS_OUTPUT_DIR}/' are writable. Some task instructions may explicitly allow additional exact target paths.`,
    parameters: {
      path: {
        type: "string",
        description: `Relative path to the output file (MUST start with '${ANALYSIS_OUTPUT_DIR}/', e.g., '${ANALYSIS_OUTPUT_DIR}/domains/my-domain/requirements/content.json')`,
      },
      content: {
        type: "string",
        description:
          "Content to write to the file. For JSON output, provide valid JSON string (not wrapped in markdown code blocks).",
      },
    },
    required: ["path", "content"],
  },
  {
    name: "replace_lines",
    description:
      "Replace a range of lines in an existing source file with new content. The path must be in the task's explicitly allowed write paths. Use read_file first to see the line numbers, then call this tool with the exact start and end lines to replace. This is the primary tool for modifying existing files.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to the source file from project root (e.g., 'src/controllers/auth.js'). Must be an explicitly allowed path.",
      },
      start_line: {
        type: "number",
        description:
          "1-based line number of the first line to replace (inclusive).",
      },
      end_line: {
        type: "number",
        description:
          "1-based line number of the last line to replace (inclusive).",
      },
      new_content: {
        type: "string",
        description:
          "The replacement text. Replaces everything from start_line to end_line. Use an empty string to delete lines.",
      },
    },
    required: ["path", "start_line", "end_line", "new_content"],
  },
  {
    name: "insert_lines",
    description:
      "Insert new lines at a specific position in an existing file without replacing any existing content. The path must be in the task's explicitly allowed write paths. Use read_file first to see the line numbers, then call this tool to insert content before or after a specific line. This is ideal for adding new functions, imports, or code blocks.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path to the source file from project root (e.g., 'src/utils/helpers.js'). Must be an explicitly allowed path.",
      },
      position: {
        type: "string",
        description:
          "Where to insert: 'before' inserts before the line_number, 'after' inserts after the line_number, 'start' inserts at file start, 'end' appends at file end.",
        enum: ["before", "after", "start", "end"],
      },
      line_number: {
        type: "number",
        description:
          "1-based line number for 'before' or 'after' positions. Ignored for 'start' and 'end'.",
      },
      content: {
        type: "string",
        description:
          "The content to insert. Will be added as new lines without removing existing content.",
      },
    },
    required: ["path", "position", "content"],
  },
  {
    name: "rename_file",
    description:
      "Rename or move a file within the project. Both old and new paths must be in the task's explicitly allowed write paths. Use this to restructure code, fix file naming, or relocate files to appropriate directories.",
    parameters: {
      old_path: {
        type: "string",
        description:
          "Current relative path to the file from project root (e.g., 'src/old-name.js'). Must be an explicitly allowed path.",
      },
      new_path: {
        type: "string",
        description:
          "New relative path for the file from project root (e.g., 'src/utils/new-name.js'). Must be an explicitly allowed path.",
      },
    },
    required: ["old_path", "new_path"],
  },
];

/**
 * Tool execution handlers
 */
export class FileToolExecutor {
  /**
   * @param {string} projectRoot - Absolute path to the project root
   * @param {string} [allowedOutputPrefix] - Default writable prefix (e.g. ".market-research").
   *   Defaults to ".code-analysis" for backwards compatibility.
   */
  constructor(projectRoot, allowedOutputPrefix = DEFAULT_OUTPUT_PREFIX) {
    this.projectRoot = projectRoot;
    this.allowedOutputPrefix = allowedOutputPrefix;
    this.maxFileSize = 500 * 1024; // 500KB limit per file
    this.allowedWritePaths = new Set();
    this.allowAnyWrite = false;
    this.allowAnyRead = false;
  }

  /**
   * Allow the agent to write/edit any file in the project root.
   * Used for IMPLEMENT_FIX tasks where the fix may touch arbitrary source files.
   * @param {boolean} allow
   */
  setAllowAnyWrite(allow) {
    this.allowAnyWrite = allow;
  }

  /**
   * Allow the agent to read any file in the project root, including .code-analysis/ outputs.
   * Used for CUSTOM_CODEBASE_TASK where the agent needs full read access to understand the codebase.
   * @param {boolean} allow
   */
  setAllowAnyRead(allow) {
    this.allowAnyRead = allow;
  }

  /**
   * Allow writing to specific project-relative file paths.
   * @param {string[]} paths - Project-relative paths that can be written
   */
  setAllowedWritePaths(paths) {
    const normalizedPaths = (paths || [])
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.replace(/\\/g, "/"));

    this.allowedWritePaths = new Set(normalizedPaths);
  }

  /**
   * Create a success result
   * @private
   */
  _success(message, data = {}) {
    return { success: true, message, data };
  }

  /**
   * Create an error result
   * @private
   */
  _error(message, code, type = TOOL_ERROR_TYPES.VALIDATION, details = {}) {
    return {
      success: false,
      message,
      error: { code, type, ...details },
    };
  }

  /**
   * Execute a tool call and return string result for LLM consumption.
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} args - Tool arguments
   * @returns {Promise<string>} String result of tool execution
   */
  async executeTool(toolName, args) {
    let result;
    switch (toolName) {
      case "read_file":
        result = await this.readFile(args.path);
        break;
      case "list_directory":
        result = await this.listDirectory(args.path, args.recursive);
        break;
      case "search_files":
        result = await this.searchFiles(args.pattern, args.directory);
        break;
      case "write_file":
        result = await this.writeFile(args.path, args.content);
        break;
      case "replace_lines":
        result = await this.replaceLines(
          args.path,
          args.start_line,
          args.end_line,
          args.new_content,
        );
        break;
      case "insert_lines":
        result = await this.insertLines(
          args.path,
          args.position,
          args.line_number,
          args.content,
        );
        break;
      case "rename_file":
        result = await this.renameFile(args.old_path, args.new_path);
        break;
      default:
        result = this._error(
          `Unknown tool: ${toolName}`,
          TOOL_ERROR_CODES.UNKNOWN_TOOL,
          TOOL_ERROR_TYPES.INTERNAL,
          { toolName },
        );
    }
    if (result.success) {
      return result?.content || result.data?.content || result.message;
    }
    return result.message;
  }

  /**
   * Replace a range of lines in a file
   * @private
   */
  async replaceLines(relativePath, startLine, endLine, newContent) {
    // Security: Reject absolute paths immediately
    if (path.isAbsolute(relativePath)) {
      return this._error(
        "Access denied: absolute paths are not allowed",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const fullPath = path.join(this.projectRoot, relativePath);

    // Security: Check path traversal FIRST (most critical)
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isExplicitlyAllowedPath = this.allowedWritePaths.has(normalizedPath);

    if (!isExplicitlyAllowedPath && !this.allowAnyWrite) {
      return this._error(
        `replace_lines can only modify explicitly allowed paths. "${relativePath}" is not in the allowed list.`,
        TOOL_ERROR_CODES.PERMISSION_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    let currentContent;
    try {
      currentContent = await fs.readFile(fullPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return this._error(
          `File not found: ${relativePath}. Cannot edit a file that does not exist.`,
          TOOL_ERROR_CODES.FILE_NOT_FOUND,
          TOOL_ERROR_TYPES.FILESYSTEM,
          { path: relativePath },
        );
      }
      return this._error(
        `Error reading file: ${error.message}`,
        TOOL_ERROR_CODES.READ_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }

    const lines = currentContent.split("\n");
    const totalLines = lines.length;

    if (startLine < 1 || startLine > totalLines) {
      return this._error(
        `start_line ${startLine} is out of range. File has ${totalLines} lines (1-based).`,
        TOOL_ERROR_CODES.INVALID_LINE_RANGE,
        TOOL_ERROR_TYPES.VALIDATION,
        { startLine, totalLines },
      );
    }
    if (endLine < startLine || endLine > totalLines) {
      return this._error(
        `end_line ${endLine} is out of range. Must be >= start_line (${startLine}) and <= ${totalLines}.`,
        TOOL_ERROR_CODES.INVALID_LINE_RANGE,
        TOOL_ERROR_TYPES.VALIDATION,
        { startLine, endLine, totalLines },
      );
    }

    const replacementLines = newContent === "" ? [] : newContent.split("\n");
    if (
      replacementLines.length > 0 &&
      replacementLines[replacementLines.length - 1] === "" &&
      newContent.endsWith("\n")
    ) {
      replacementLines.pop();
    }

    const before = lines.slice(0, startLine - 1);
    const after = lines.slice(endLine);
    const newLines = [...before, ...replacementLines, ...after];

    try {
      await fs.writeFile(fullPath, newLines.join("\n"), "utf-8");
      const removedCount = endLine - startLine + 1;
      const addedCount = replacementLines.length;
      return this._success(
        `Replaced lines ${startLine}-${endLine} in ${relativePath} (removed ${removedCount} lines, inserted ${addedCount} lines)`,
        {
          path: relativePath,
          startLine,
          endLine,
          linesRemoved: removedCount,
          linesInserted: addedCount,
        },
      );
    } catch (error) {
      return this._error(
        `Error writing file: ${error.message}`,
        TOOL_ERROR_CODES.WRITE_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }
  }

  /**
   * Write file content
   * @private
   */
  async writeFile(relativePath, content) {
    // Security: Reject absolute paths immediately
    if (path.isAbsolute(relativePath)) {
      return this._error(
        "Access denied: absolute paths are not allowed",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const fullPath = path.join(this.projectRoot, relativePath);

    // Security: Check path traversal FIRST (most critical)
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isAnalysisPath = normalizedPath.startsWith(
      `${this.allowedOutputPrefix}/`,
    );
    const isExplicitlyAllowedPath = this.allowedWritePaths.has(normalizedPath);

    if (!isAnalysisPath && !isExplicitlyAllowedPath && !this.allowAnyWrite) {
      return this._error(
        `Can only write files to ${this.allowedOutputPrefix}/ directory for security reasons, unless the path is explicitly allowed by the task.`,
        TOOL_ERROR_CODES.PERMISSION_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    try {
      const dirPath = path.dirname(fullPath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");

      return this._success(
        `File written to ${relativePath} (${content.length} bytes)`,
        {
          path: relativePath,
          bytesWritten: content.length,
        },
      );
    } catch (error) {
      return this._error(
        `Error writing file: ${error.message}`,
        TOOL_ERROR_CODES.WRITE_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }
  }

  /**
   * Read file content
   * @private
   */
  async readFile(relativePath) {
    // Security: Reject absolute paths immediately
    if (path.isAbsolute(relativePath)) {
      return this._error(
        "Access denied: absolute paths are not allowed",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const fullPath = path.join(this.projectRoot, relativePath);

    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isExplicitlyAllowedReadPath =
      this.allowedWritePaths.has(normalizedPath);
    if (
      normalizedPath.startsWith(`${this.allowedOutputPrefix}/`) &&
      !isExplicitlyAllowedReadPath &&
      !this.allowAnyRead
    ) {
      return this._error(
        `Cannot read files in ${this.allowedOutputPrefix} directory. This directory contains analysis outputs, not source code.`,
        TOOL_ERROR_CODES.READ_PROTECTED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    try {
      const stats = await fs.stat(fullPath);

      if (!stats.isFile()) {
        return this._error(
          `${relativePath} is not a file`,
          TOOL_ERROR_CODES.NOT_A_FILE,
          TOOL_ERROR_TYPES.VALIDATION,
          { path: relativePath },
        );
      }

      if (stats.size > this.maxFileSize) {
        return this._error(
          `File too large (${Math.round(stats.size / 1024)}KB). Maximum size is ${this.maxFileSize / 1024}KB`,
          TOOL_ERROR_CODES.FILE_TOO_LARGE,
          TOOL_ERROR_TYPES.VALIDATION,
          { path: relativePath, sizeKB: Math.round(stats.size / 1024) },
        );
      }

      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n");
      const width = String(lines.length).length;
      const numbered = lines
        .map((line, i) => `${String(i + 1).padStart(width, " ")}: ${line}`)
        .join("\n");

      return this._success(`Read ${relativePath} (${lines.length} lines)`, {
        content: numbered,
        path: relativePath,
        lines: lines.length,
        sizeBytes: stats.size,
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return this._error(
          `File not found: ${relativePath}`,
          TOOL_ERROR_CODES.FILE_NOT_FOUND,
          TOOL_ERROR_TYPES.FILESYSTEM,
          { path: relativePath },
        );
      }
      return this._error(
        `Error reading file: ${error.message}`,
        TOOL_ERROR_CODES.READ_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }
  }

  /**
   * List directory contents
   * @private
   */
  async listDirectory(relativePath, recursive = false) {
    const fullPath = path.join(this.projectRoot, relativePath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return this._error(
          `${relativePath} is not a directory`,
          TOOL_ERROR_CODES.NOT_A_DIRECTORY,
          TOOL_ERROR_TYPES.VALIDATION,
          { path: relativePath },
        );
      }

      const listing = recursive
        ? await this._listRecursive(fullPath, relativePath)
        : await this._listFlat(fullPath, relativePath);

      const entries = listing.split("\n").filter((line) => line.trim());
      return this._success(
        `Listed ${relativePath} (${entries.length} entries)`,
        {
          content: listing,
          path: relativePath,
          recursive,
          entries: entries.length,
        },
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        return this._error(
          `Directory not found: ${relativePath}`,
          TOOL_ERROR_CODES.FILE_NOT_FOUND,
          TOOL_ERROR_TYPES.FILESYSTEM,
          { path: relativePath },
        );
      }
      return this._error(
        `Error listing directory: ${error.message}`,
        TOOL_ERROR_CODES.READ_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }
  }

  /**
   * List directory (non-recursive)
   * @private
   */
  async _listFlat(fullPath, relativePath) {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const items = entries.map((entry) => {
      return entry.isDirectory() ? `${entry.name}/` : entry.name;
    });

    return items.join("\n");
  }

  /**
   * List directory recursively
   * @private
   */
  async _listRecursive(fullPath, relativePath, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
      return "";
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      // Skip common ignored directories
      if (
        entry.isDirectory() &&
        ["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)
      ) {
        continue;
      }

      const indent = "  ".repeat(depth);
      const marker = entry.isDirectory() ? "📁" : "📄";
      items.push(`${indent}${marker} ${entry.name}`);

      if (entry.isDirectory()) {
        const subPath = path.join(fullPath, entry.name);
        const subRelative = path.join(relativePath, entry.name);
        const subItems = await this._listRecursive(
          subPath,
          subRelative,
          depth + 1,
          maxDepth,
        );
        if (subItems) items.push(subItems);
      }
    }

    return items.join("\n");
  }

  /**
   * Search for files matching pattern
   * @private
   */
  async searchFiles(pattern, directory = ".") {
    const startPath = path.join(this.projectRoot, directory);

    // Security check
    const resolvedPath = path.resolve(startPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { directory },
      );
    }

    const matches = [];
    await this._searchRecursive(startPath, pattern, matches, directory);

    const message =
      matches.length === 0
        ? `No files found matching pattern: ${pattern}`
        : `Found ${matches.length} files matching "${pattern}"`;

    return this._success(message, {
      content: matches.length > 0 ? matches.join("\n") : message,
      pattern,
      directory,
      matches,
      count: matches.length,
    });
  }

  /**
   * Recursive file search helper
   * @private
   */
  async _searchRecursive(currentPath, pattern, matches, basePath) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip ignored directories
        if (
          entry.isDirectory() &&
          ["node_modules", ".git", "dist", "build"].includes(entry.name)
        ) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(
          path.join(this.projectRoot, basePath),
          fullPath,
        );

        if (entry.isDirectory()) {
          await this._searchRecursive(fullPath, pattern, matches, basePath);
        } else if (this._matchPattern(entry.name, pattern)) {
          matches.push(relativePath);
        }
      }
    } catch {
      // Skip directories we can't read
      return;
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   * @private
   */
  _matchPattern(filename, pattern) {
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }

  /**
   * Insert lines at a specific position in a file without replacing existing content
   * @private
   */
  async insertLines(relativePath, position, lineNumber, content) {
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const isExplicitlyAllowedPath = this.allowedWritePaths.has(normalizedPath);

    if (!isExplicitlyAllowedPath && !this.allowAnyWrite) {
      return this._error(
        `insert_lines can only modify explicitly allowed paths. "${relativePath}" is not in the allowed list.`,
        TOOL_ERROR_CODES.PERMISSION_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    const fullPath = path.join(this.projectRoot, relativePath);

    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.projectRoot);
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: relativePath },
      );
    }

    let currentContent;
    try {
      currentContent = await fs.readFile(fullPath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        return this._error(
          `File not found: ${relativePath}. Cannot insert into a file that does not exist.`,
          TOOL_ERROR_CODES.FILE_NOT_FOUND,
          TOOL_ERROR_TYPES.FILESYSTEM,
          { path: relativePath },
        );
      }
      return this._error(
        `Error reading file: ${error.message}`,
        TOOL_ERROR_CODES.READ_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }

    const lines = currentContent.split("\n");
    const totalLines = lines.length;

    // Prepare content to insert
    const insertLines = content.split("\n");
    // Remove trailing empty element if content ends with newline
    if (
      insertLines.length > 0 &&
      insertLines[insertLines.length - 1] === "" &&
      content.endsWith("\n")
    ) {
      insertLines.pop();
    }

    let newLines;
    let insertPosition;

    switch (position) {
      case "start":
        newLines = [...insertLines, ...lines];
        insertPosition = 1;
        break;

      case "end":
        newLines = [...lines, ...insertLines];
        insertPosition = totalLines + 1;
        break;

      case "before":
        if (!lineNumber || lineNumber < 1 || lineNumber > totalLines) {
          return this._error(
            `line_number ${lineNumber} is out of range for 'before' position. File has ${totalLines} lines (1-based).`,
            TOOL_ERROR_CODES.INVALID_LINE_RANGE,
            TOOL_ERROR_TYPES.VALIDATION,
            { lineNumber, totalLines, position },
          );
        }
        newLines = [
          ...lines.slice(0, lineNumber - 1),
          ...insertLines,
          ...lines.slice(lineNumber - 1),
        ];
        insertPosition = lineNumber;
        break;

      case "after":
        if (!lineNumber || lineNumber < 1 || lineNumber > totalLines) {
          return this._error(
            `line_number ${lineNumber} is out of range for 'after' position. File has ${totalLines} lines (1-based).`,
            TOOL_ERROR_CODES.INVALID_LINE_RANGE,
            TOOL_ERROR_TYPES.VALIDATION,
            { lineNumber, totalLines, position },
          );
        }
        newLines = [
          ...lines.slice(0, lineNumber),
          ...insertLines,
          ...lines.slice(lineNumber),
        ];
        insertPosition = lineNumber + 1;
        break;

      default:
        return this._error(
          `Invalid position "${position}". Must be one of: start, end, before, after.`,
          TOOL_ERROR_CODES.INVALID_POSITION,
          TOOL_ERROR_TYPES.VALIDATION,
          { position },
        );
    }

    try {
      await fs.writeFile(fullPath, newLines.join("\n"), "utf-8");
      return this._success(
        `Inserted ${insertLines.length} lines at position '${position}'${lineNumber ? ` (line ${lineNumber})` : ""} in ${relativePath}`,
        {
          path: relativePath,
          position,
          lineNumber: insertPosition,
          linesInserted: insertLines.length,
          totalLines: newLines.length,
        },
      );
    } catch (error) {
      return this._error(
        `Error writing file: ${error.message}`,
        TOOL_ERROR_CODES.WRITE_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: relativePath, originalError: error.message },
      );
    }
  }

  /**
   * Rename or move a file within the project
   * @private
   */
  async renameFile(oldRelativePath, newRelativePath) {
    const normalizedOldPath = oldRelativePath.replace(/\\/g, "/");
    const normalizedNewPath = newRelativePath.replace(/\\/g, "/");

    const isOldPathAllowed = this.allowedWritePaths.has(normalizedOldPath);
    const isNewPathAllowed = this.allowedWritePaths.has(normalizedNewPath);

    if (!isOldPathAllowed && !this.allowAnyWrite) {
      return this._error(
        `rename_file source path "${oldRelativePath}" is not in the allowed list. Ensure the task handler has granted access to this path.`,
        TOOL_ERROR_CODES.PERMISSION_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: oldRelativePath },
      );
    }

    if (!isNewPathAllowed && !this.allowAnyWrite) {
      return this._error(
        `rename_file destination path "${newRelativePath}" is not in the allowed list. Ensure the task handler has granted access to this path.`,
        TOOL_ERROR_CODES.PERMISSION_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: newRelativePath },
      );
    }

    const oldFullPath = path.join(this.projectRoot, oldRelativePath);
    const newFullPath = path.join(this.projectRoot, newRelativePath);

    // Security: ensure both paths are within project root
    const resolvedOldPath = path.resolve(oldFullPath);
    const resolvedNewPath = path.resolve(newFullPath);
    const resolvedRoot = path.resolve(this.projectRoot);

    if (!resolvedOldPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: old path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: oldRelativePath },
      );
    }
    if (!resolvedNewPath.startsWith(resolvedRoot)) {
      return this._error(
        "Access denied: new path outside project root",
        TOOL_ERROR_CODES.ACCESS_DENIED,
        TOOL_ERROR_TYPES.SECURITY,
        { path: newRelativePath },
      );
    }

    // Check if source exists
    try {
      await fs.access(oldFullPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return this._error(
          `Source file not found: ${oldRelativePath}`,
          TOOL_ERROR_CODES.FILE_NOT_FOUND,
          TOOL_ERROR_TYPES.FILESYSTEM,
          { path: oldRelativePath },
        );
      }
      return this._error(
        `Error accessing source file: ${error.message}`,
        TOOL_ERROR_CODES.READ_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: oldRelativePath, originalError: error.message },
      );
    }

    // Check if destination already exists
    try {
      await fs.access(newFullPath);
      return this._error(
        `Destination file already exists: ${newRelativePath}. Cannot overwrite with rename.`,
        TOOL_ERROR_CODES.FILE_EXISTS,
        TOOL_ERROR_TYPES.FILESYSTEM,
        { path: newRelativePath },
      );
    } catch (error) {
      // File doesn't exist - this is what we want
      if (error.code !== "ENOENT") {
        return this._error(
          `Error checking destination: ${error.message}`,
          TOOL_ERROR_CODES.READ_ERROR,
          TOOL_ERROR_TYPES.FILESYSTEM,
          { path: newRelativePath, originalError: error.message },
        );
      }
    }

    try {
      // Create destination directory if it doesn't exist
      const newDirPath = path.dirname(newFullPath);
      await fs.mkdir(newDirPath, { recursive: true });

      // Try to use git mv if this is a git repository
      // This ensures git tracks the rename properly, even if content changes
      let usedGitMv = false;
      try {
        // Check if we're in a git repository
        await execAsync("git rev-parse --git-dir", {
          cwd: this.projectRoot,
        });

        // Use git mv for better rename tracking
        await execAsync(
          `git mv "${oldRelativePath.replace(/"/g, '\\"')}" "${newRelativePath.replace(/"/g, '\\"')}"`,
          { cwd: this.projectRoot },
        );
        usedGitMv = true;
      } catch (gitError) {
        // Not a git repo or git command failed - use fs.rename as fallback
        await fs.rename(oldFullPath, newFullPath);
      }

      const method = usedGitMv ? "git mv" : "fs rename";
      return this._success(
        `Renamed "${oldRelativePath}" to "${newRelativePath}" (${method})`,
        {
          oldPath: oldRelativePath,
          newPath: newRelativePath,
          method,
        },
      );
    } catch (error) {
      return this._error(
        `Error renaming file: ${error.message}`,
        TOOL_ERROR_CODES.WRITE_ERROR,
        TOOL_ERROR_TYPES.FILESYSTEM,
        {
          oldPath: oldRelativePath,
          newPath: newRelativePath,
          originalError: error.message,
        },
      );
    }
  }
}
