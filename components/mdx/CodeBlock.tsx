import React, { useState } from "react";
import styles from "./CodeBlock.module.css";

const copyToClipboard = (str: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(str).catch((err) => {
      console.error("Could not copy text: ", err);
    });
  } else if ((window as any).clipboardData) {
    (window as any).clipboardData.setData("Text", str);
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
  children: any;
}

// Walk a React node tree and concatenate its plain text — used to recover
// the raw source from highlighted JSX so the Copy button still works.
function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    const children = (node.props as any)?.children;
    return extractText(children);
  }
  return "";
}

const CodeBlock = (props: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  // Handle different prop structures
  if (!props.children || !props.children.props) {
    return <pre style={{ fontFamily: 'monospace', padding: '1rem' }}>{String(props.children)}</pre>;
  }

  const className = props.children.props.className || "";
  const code = extractText(props.children.props.children).trim();
  const language = className.replace(/language-/, "") || "text";
  const file = props.children.props.file;
  const title = props.children.props.title;

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
        <button onClick={handleCopy} className={copyBtnClass}>
          {isCopied ? (
            <><span>✓</span><span>Copied!</span></>
          ) : (
            <><span>📋</span><span>Copy</span></>
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
