"use client";

import { Fragment, ReactNode } from "react";
import CopyButton from "./CopyButton";

// A small, dependency-free Markdown renderer built for AI chat responses:
// fenced code blocks (with language label, copy button, and lightweight
// syntax coloring), inline code, bold/italic, links, headings, and
// ordered/unordered lists. It intentionally does not try to be a full
// CommonMark implementation — just enough to make AI responses look right.

const KEYWORDS: Record<string, string[]> = {
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "import", "export", "default", "from", "async", "await", "class", "extends", "new", "try", "catch", "throw", "typeof", "of", "in", "switch", "case", "break", "continue", "null", "undefined", "true", "false", "this"],
  typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "import", "export", "default", "from", "async", "await", "class", "extends", "new", "try", "catch", "throw", "typeof", "of", "in", "interface", "type", "implements", "public", "private", "readonly", "enum", "switch", "case", "break", "continue", "null", "undefined", "true", "false", "this"],
  python: ["def", "return", "if", "elif", "else", "for", "while", "import", "from", "as", "class", "try", "except", "finally", "raise", "with", "lambda", "yield", "async", "await", "None", "True", "False", "and", "or", "not", "in", "is", "pass", "break", "continue", "self"],
  bash: ["if", "then", "else", "fi", "for", "do", "done", "while", "echo", "export", "function", "return", "case", "esac"],
  json: ["true", "false", "null"],
  sql: ["SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "JOIN", "LEFT", "RIGHT", "INNER", "ON", "GROUP", "BY", "ORDER", "LIMIT", "AS", "AND", "OR", "NOT", "NULL", "CREATE", "TABLE"],
};

function aliasLang(lang: string) {
  const l = lang.toLowerCase();
  if (["js", "jsx"].includes(l)) return "javascript";
  if (["ts", "tsx"].includes(l)) return "typescript";
  if (["py"].includes(l)) return "python";
  if (["sh", "shell", "zsh"].includes(l)) return "bash";
  return l;
}

// Tokenizes a line of code into colored spans: strings, comments, numbers,
// keywords. Not a real parser — a fast regex pass that looks right for the
// common cases in AI-generated snippets.
function highlightLine(line: string, lang: string): ReactNode {
  const keywords = KEYWORDS[lang] || [];
  const pattern =
    /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)/g;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const pushWithKeywords = (text: string) => {
    if (!keywords.length) {
      parts.push(text);
      return;
    }
    const kwPattern = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    let li = 0;
    let m: RegExpExecArray | null;
    while ((m = kwPattern.exec(text))) {
      if (m.index > li) parts.push(text.slice(li, m.index));
      parts.push(
        <span key={`kw-${key++}`} className="text-purple-400 dark:text-purple-300">
          {m[0]}
        </span>
      );
      li = m.index + m[0].length;
    }
    if (li < text.length) parts.push(text.slice(li));
  };

  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) {
      pushWithKeywords(line.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(
        <span key={`c-${key++}`} className="text-gray-400 dark:text-gray-500 italic">
          {match[1]}
        </span>
      );
    } else if (match[2]) {
      parts.push(
        <span key={`s-${key++}`} className="text-emerald-400 dark:text-emerald-300">
          {match[2]}
        </span>
      );
    } else if (match[3]) {
      parts.push(
        <span key={`n-${key++}`} className="text-amber-400 dark:text-amber-300">
          {match[3]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    pushWithKeywords(line.slice(lastIndex));
  }
  return <>{parts}</>;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const normalizedLang = aliasLang(lang || "text");
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-gray-700/50 bg-[#1e1e2e] text-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-gray-700/50">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wide">
          {lang || "text"}
        </span>
        <CopyButton
          text={code}
          label="Copy code"
          className="text-gray-400 hover:text-white"
        />
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="font-mono text-[13px] leading-relaxed text-gray-100">
          {lines.map((line, i) => (
            <div key={i}>{line ? highlightLine(line, normalizedLang) : "\u00A0"}</div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// Parses inline markdown (bold, italic, inline code, links) within a single
// block of text and returns React nodes.
function renderInline(text: string, keyPrefix: string): ReactNode {
  const pattern = /(\*\*(?:[^*]+)\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*(?:[^*]+)\*)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-b-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={`${keyPrefix}-c-${key++}`}
          className="bg-gray-200 dark:bg-gray-700 text-pink-600 dark:text-pink-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const m = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        parts.push(
          <a
            key={`${keyPrefix}-a-${key++}`}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {m[1]}
          </a>
        );
      }
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={`${keyPrefix}-i-${key++}`}>{token.slice(1, -1)}</em>
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

export default function Markdown({ content }: { content: string }) {
  // First split out fenced code blocks so their contents are never touched
  // by inline/list/heading parsing.
  const segments: { type: "code" | "text"; lang?: string; content: string }[] = [];
  const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = fenceRegex.exec(content))) {
    if (m.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, m.index) });
    }
    segments.push({ type: "code", lang: m[1], content: m[2] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return (
    <div className="text-sm leading-relaxed space-y-2">
      {segments.map((seg, si) => {
        if (seg.type === "code") {
          return <CodeBlock key={si} code={seg.content} lang={seg.lang || ""} />;
        }

        // Block-level parsing for the plain-text segment: headings, lists,
        // paragraphs — line by line, grouping consecutive list items.
        const lines = seg.content.split("\n");
        const blocks: ReactNode[] = [];
        let listBuffer: { ordered: boolean; text: string }[] = [];
        let key = 0;

        const flushList = () => {
          if (!listBuffer.length) return;
          const ordered = listBuffer[0].ordered;
          const items = listBuffer;
          listBuffer = [];
          const Tag = ordered ? "ol" : "ul";
          blocks.push(
            <Tag
              key={`${si}-l-${key++}`}
              className={ordered ? "list-decimal ml-5 space-y-1" : "list-disc ml-5 space-y-1"}
            >
              {items.map((it, ii) => (
                <li key={ii}>{renderInline(it.text, `${si}-li-${ii}`)}</li>
              ))}
            </Tag>
          );
        };

        lines.forEach((line, li) => {
          const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
          const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
          const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);

          if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const sizeClass = level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-sm font-bold";
            blocks.push(
              <p key={`${si}-h-${key++}`} className={`${sizeClass} mt-1`}>
                {renderInline(headingMatch[2], `${si}-h-${li}`)}
              </p>
            );
          } else if (ulMatch) {
            listBuffer.push({ ordered: false, text: ulMatch[1] });
          } else if (olMatch) {
            listBuffer.push({ ordered: true, text: olMatch[1] });
          } else if (line.trim() === "") {
            flushList();
          } else {
            flushList();
            blocks.push(
              <p key={`${si}-p-${key++}`} className="whitespace-pre-wrap">
                {renderInline(line, `${si}-p-${li}`)}
              </p>
            );
          }
        });
        flushList();

        return <Fragment key={si}>{blocks}</Fragment>;
      })}
    </div>
  );
}
