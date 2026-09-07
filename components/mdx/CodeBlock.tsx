import React, { useState } from "react";
import styles from "./CodeBlock.module.css";

const copyToClipboard = (str: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(str).catch((err) => {
      console.error("Could not copy text: ", err);
    });
  }
};

// Language display names
const languageMap: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  css: "CSS",
  html: "HTML",
  jsx: "React",
  tsx: "React",
  bash: "Bash",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  sql: "SQL",
  php: "PHP",
  java: "Java",
  go: "Go",
  rust: "Rust",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  ruby: "Ruby",
  xml: "XML",
  dockerfile: "Docker",
  text: "Text",
};

function getLanguageDisplayName(lang: string): string {
  return languageMap[lang] || lang.toUpperCase();
}

interface CodeBlockProps {
  children?: React.ReactNode;
}

// Props of the <code> element that rehype/shiki nests inside <pre>
interface InnerCodeProps {
  className?: string;
  children?: React.ReactNode;
  file?: string;
  title?: string;
}

// Walk a React node tree and concatenate its plain text — used to recover
// the raw source from highlighted JSX so the Copy button still works.
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return "";
}

const CodeBlock = (props: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  // Handle different prop structures
  if (!React.isValidElement<InnerCodeProps>(props.children)) {
    return <pre style={{ fontFamily: 'monospace', padding: '1rem' }}>{props.children}</pre>;
  }

  const inner = props.children.props;
  const className = inner.className || "";
  const code = extractText(inner.children).trim();
  const language = className.replace(/language-/, "") || "text";
  const file = inner.file;
  const title = inner.title;

  const handleCopy = () => {
    copyToClipboard(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyBtnClass = `${styles.copyButton} ${isCopied ? styles.copyButtonCopied : ''}`;

  return (
    <div className={styles.codeBlockWrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Language badge */}
          <div className={styles.languageBadge}>
            {getLanguageDisplayName(language)}
          </div>

          {/* File name or title */}
          {(file || title) && (
            <div className={styles.fileName}>
              {title || file}
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className={copyBtnClass}
          aria-label={isCopied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          aria-live="polite"
        >
          {isCopied ? (
            <><span aria-hidden="true">✓</span><span>Copied!</span></>
          ) : (
            <><span aria-hidden="true">📋</span><span>Copy</span></>
          )}
        </button>
      </div>

      {/* Code content — render the highlighted JSX tree shiki/rehype produced */}
      <div className={styles.codeContainer}>
        <pre className={styles.codeContent}>
          {props.children}
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
