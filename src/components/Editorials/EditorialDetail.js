import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchEditorialBySlug, getPlatformLabel } from "../../api/editorials";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Editorials.css";

function formatDate(value) {
  if (!value) {
    return "Recently added";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch (error) {
    return "Recently added";
  }
}

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return !inline && match ? (
    <div className="code-block-container" style={{ position: "relative", marginTop: "1rem", marginBottom: "1rem" }}>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: copied ? "#4CAF50" : "#2d2d2d",
          color: "white",
          border: "1px solid #444",
          padding: "4px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          zIndex: 1,
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

function EditorialDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const backToList = `/editorials${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const [editorial, setEditorial] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEditorial() {
      try {
        setStatus("loading");
        const data = await fetchEditorialBySlug(slug);

        if (!isMounted) {
          return;
        }

        setEditorial(data);
        setStatus("success");
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError("We couldn't find that editorial.");
        setStatus("error");
      }
    }

    loadEditorial();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <section className="editorials-page">
      <Container fluid className="editorials-hero">
        <Container className="editorials-shell editorial-detail-shell">
          <Link className="editorials-back-link" to={backToList}>
            ← Back to all editorials
          </Link>

          {status === "loading" && (
            <div className="editorials-feedback-card">
              Loading editorial...
            </div>
          )}

          {status === "error" && (
            <div className="editorials-feedback-card error">{error}</div>
          )}

          {status === "success" && editorial && (
            <>
              <div className="editorial-detail-header">
                <div className="editorial-detail-meta">
                  <span>{getPlatformLabel(editorial.platform)}</span>
                  <span>
                    Contest Date:{" "}
                    {formatDate(editorial.contest_date || editorial.created_at)}
                  </span>
                  <span>
                    {(editorial.questions || []).length} question
                    {(editorial.questions || []).length === 1 ? "" : "s"}
                  </span>
                </div>
                <h1>{editorial.contest_name}</h1>
                <p>
                  Full contest editorial with every published question from the
                  backend.
                </p>
                <a
                  className="editorial-contest-link"
                  href={editorial.contest_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open contest link
                </a>
              </div>

              <div className="editorial-question-list">
                {(editorial.questions || []).map((question, index) => (
                  <details
                    className="editorial-question-card editorial-question-dropdown"
                    key={question.id || `${question.question_name}-${index}`}
                  >
                    <summary className="editorial-question-summary">
                      <div className="editorial-question-summary-text">
                        <div className="editorial-question-index">
                          Question {index + 1}
                        </div>
                        <h2>{question.question_name}</h2>
                      </div>
                      <span className="editorial-dropdown-icon">+</span>
                    </summary>

                    <div className="editorial-question-body">
                      <a
                        href={question.question_link}
                        target="_blank"
                        rel="noreferrer"
                        className="editorial-visit-problem-btn"
                      >
                        Visit problem
                      </a>

                      <div className="editorial-content-block">
                        <h3>Explanation</h3>
                        {question.explanation ? (
                          <div className="editorial-markdown">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                code: CodeBlock,
                              }}
                            >
                              {question.explanation}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p>No explanation added yet.</p>
                        )}
                      </div>

                      <div className="editorial-content-block">
                        <h3>Code</h3>
                        {question.code ? (
                          <CodeBlock className="language-cpp">
                            {question.code}
                          </CodeBlock>
                        ) : (
                          <p>No code added yet.</p>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}
        </Container>
      </Container>
    </section>
  );
}

export default EditorialDetail;
