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
  children: {
    props: {
      className?: string;
      children: string;
      file?: string;
      title?: string;
    };
  } | any;
}

const CodeBlock = (props: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  // Handle different prop structures
  if (!props.children || !props.children.props) {
    return <pre style={{ fontFamily: 'monospace', padding: '1rem' }}>{String(props.children)}</pre>;
  }

  const className = props.children.props.className || "";
  const code = typeof props.children.props.children === 'string'
    ? props.children.props.children.trim()
    : '';
  const language = className.replace(/language-/, "") || "text";
  const file = props.children.props.file;
  const title = props.children.props.title;

  // Check if the code block contains build-time highlighted HTML from @shikijs/rehype
  const innerHtml = props.children.props.dangerouslySetInnerHTML?.__html;
  const isPreHighlighted = !!innerHtml;

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
          {/* Traffic lights */}
          <div className={styles.trafficLights}>
            <div className={styles.trafficLightRed} />
            <div className={styles.trafficLightYellow} />
            <div className={styles.trafficLightGreen} />
          </div>

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

      {/* Code content */}
      <div className={styles.codeContainer}>
        {isPreHighlighted ? (
          // Build-time highlighted code from @shikijs/rehype — already HTML
          <div
            className={styles.codeContent}
            dangerouslySetInnerHTML={{ __html: innerHtml }}
          />
        ) : (
          // Fallback: plain code (no client-side Shiki needed)
          <div className={styles.codeContent}>
            <pre><code>{code}</code></pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeBlock;
