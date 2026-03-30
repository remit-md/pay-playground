/**
 * Syntax highlighting for SDK code samples.
 * Uses highlight.js with only the languages we need.
 * Custom theme colors match our design tokens.
 */

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import ruby from "highlight.js/lib/languages/ruby";
import csharp from "highlight.js/lib/languages/csharp";
import java from "highlight.js/lib/languages/java";
import swift from "highlight.js/lib/languages/swift";
import elixir from "highlight.js/lib/languages/elixir";
import json from "highlight.js/lib/languages/json";

// Register only the languages we use
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("java", java);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("elixir", elixir);
hljs.registerLanguage("json", json);

/** Map our SDK language IDs to highlight.js language names */
const LANG_MAP: Record<string, string> = {
  typescript: "typescript",
  python: "python",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  csharp: "csharp",
  java: "java",
  swift: "swift",
  elixir: "elixir",
};

/**
 * Highlight code for a given language.
 * Returns HTML string with <span class="hljs-*"> wrappers.
 */
export function highlightCode(code: string, lang: string): string {
  const hljsLang = LANG_MAP[lang];
  if (!hljsLang) {
    // Fallback: escape and return as-is
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  try {
    return hljs.highlight(code, { language: hljsLang }).value;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

/**
 * Highlight JSON. Uses highlight.js json grammar.
 */
export function highlightJson(obj: unknown): string {
  const raw = JSON.stringify(obj, null, 2);
  if (!raw) return "";
  try {
    return hljs.highlight(raw, { language: "json" }).value;
  } catch {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
