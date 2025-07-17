import React, { useState, useEffect } from "react";
import { createHighlighter } from "shiki";

const copyToClipboard = (str: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(str).then(
      function () {
        // Successfully copied
      },
      function (err) {
        console.error("Could not copy text: ", err);
      }
    );
  } else if ((window as any).clipboardData) {
    // Internet Explorer
    (window as any).clipboardData.setData("Text", str);
  }
};

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
  // Force refresh - unified background color #0d1117
  const [isCopied, setIsCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Handle different prop structures
  if (!props.children || !props.children.props) {
    return <pre style={{ fontFamily: 'monospace', padding: '1rem' }}>{String(props.children)}</pre>;
  }

  const className = props.children.props.className || "";
  const code = props.children.props.children.trim();
  const language = className.replace(/language-/, "") || "text";
  const file = props.children.props.file;
  const title = props.children.props.title;

  useEffect(() => {
    let mounted = true;

    const highlightCode = async () => {
      try {
        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: [
            "javascript", "typescript", "python", "css", "html", "jsx", "tsx", 
            "bash", "json", "yaml", "markdown", "sql", "php", "java", "go", 
            "rust", "c", "cpp", "csharp", "swift", "kotlin", "dart", "ruby",
            "xml", "dockerfile", "nginx", "apache", "lua", "perl", "shell"
          ],
        });

        if (mounted) {
          let processedLang = language;
          // Handle common language aliases
          if (language === "js") processedLang = "javascript";
          if (language === "ts") processedLang = "typescript";
          if (language === "py") processedLang = "python";
          if (language === "sh" || language === "zsh") processedLang = "bash";

          const html = highlighter.codeToHtml(code, {
            lang: processedLang as any,
            theme: "github-dark"
          });
          
          setHighlightedCode(html);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error highlighting code:", error);
        if (mounted) {
          // Fallback to plain text
          setHighlightedCode(`<pre><code>${code}</code></pre>`);
          setIsLoading(false);
        }
      }
    };

    highlightCode();

    return () => {
      mounted = false;
    };
  }, [code, language]);

  const handleCopy = async () => {
    copyToClipboard(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Language display names
  const getLanguageDisplayName = (lang: string) => {
    const languageMap: { [key: string]: string } = {
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
      text: "Text"
    };
    return languageMap[lang] || lang.toUpperCase();
  };

  return (
    <div style={{
      marginTop: "2.5rem",
      marginBottom: "3rem",
      borderRadius: "16px",
      overflow: "hidden",
      background: "#0d1117",
      border: "1px solid #30363d",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    }}>
      {/* Header */}
      <div style={{
        background: "#0d1117",
        borderBottom: "1px solid #30363d",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{
              width: "12px",
              height: "12px", 
              borderRadius: "50%",
              background: "#ff5f57"
            }} />
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#ffbd2e"
            }} />
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#28ca42"
            }} />
          </div>

          {/* Language badge */}
          <div style={{
            background: "linear-gradient(135deg, #238636 0%, #2ea043 100%)",
            color: "white",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            boxShadow: "0 2px 4px rgba(35, 134, 54, 0.3)"
          }}>
            {getLanguageDisplayName(language)}
          </div>

          {/* File name or title */}
          {(file || title) && (
            <div style={{
              color: "#8b949e",
              fontSize: "14px",
              fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
              fontStyle: "italic"
            }}>
              {title || file}
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{
            background: isCopied 
              ? "linear-gradient(135deg, #238636 0%, #2ea043 100%)"
              : "linear-gradient(135deg, #373e47 0%, #4c5763 100%)",
            border: "1px solid #444c56",
            borderRadius: "8px",
            color: "white",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
          }}
          onMouseEnter={(e) => {
            if (!isCopied) {
              e.currentTarget.style.background = "linear-gradient(135deg, #4c5763 0%, #6e7681 100%)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isCopied) {
              e.currentTarget.style.background = "linear-gradient(135deg, #373e47 0%, #4c5763 100%)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {isCopied ? (
            <>
              <span>✓</span>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div style={{
        position: "relative",
        background: "#0d1117"
      }}>
        {isLoading ? (
          <div style={{
            padding: "2rem",
            color: "#8b949e",
            fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{
              width: "16px",
              height: "16px",
              border: "2px solid #30363d",
              borderTop: "2px solid #238636",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            Highlighting code...
          </div>
        ) : (
          <div 
            style={{
              overflow: "auto",
              fontSize: "14px",
              lineHeight: "1.5",
              fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
              padding: "1.5rem 2rem",
              // Custom scrollbar styling
              scrollbarWidth: "thin",
              scrollbarColor: "#4c5763 #21262d"
            }}
            className="code-content"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        )}
      </div>

      {/* CSS for animations and scrollbar styling */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Custom scrollbar styling for webkit browsers */
        .code-content::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        
        .code-content::-webkit-scrollbar-track {
          background: #21262d;
          border-radius: 4px;
        }
        
        .code-content::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #4c5763 0%, #6e7681 100%);
          border-radius: 4px;
        }
        
        .code-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #6e7681 0%, #8b949e 100%);
        }
        
        .code-content::-webkit-scrollbar-corner {
          background: #21262d;
        }
      `}</style>
    </div>
  );
};

export default CodeBlock; 