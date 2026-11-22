import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { fetchEditorialsPage, getPlatformLabel } from "../../api/editorials";
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

function getContestDateLabel(editorial) {
  if (editorial?.contest_date) {
    return formatDate(editorial.contest_date);
  }

  return formatDate(editorial?.created_at);
}

function getPageNumberFromUrl(url, fallbackPage) {
  if (!url) {
    return null;
  }

  try {
    const page = Number(
      new URL(url, window.location.origin).searchParams.get("page")
    );
    return Number.isInteger(page) && page > 0 ? page : fallbackPage;
  } catch (error) {
    return fallbackPage;
  }
}

function getPageFromSearchParams(searchParams) {
  const page = Number(searchParams.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getTotalPages(pageData, currentPage) {
  if (!pageData || typeof pageData.count !== "number") {
    return null;
  }

  if (pageData.next && pageData.items.length > 0) {
    return Math.ceil(pageData.count / pageData.items.length);
  }

  return currentPage;
}

function EditorialList() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = getPageFromSearchParams(searchParams);
  const [pageData, setPageData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEditorials() {
      try {
        setStatus("loading");
        const data = await fetchEditorialsPage(page);

        if (!isMounted) {
          return;
        }

        setPageData(data);
        setError("");
        setStatus("success");
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError("We couldn't load the editorials right now.");
        setStatus("error");
      }
    }

    loadEditorials();

    return () => {
      isMounted = false;
    };
  }, [page]);

  const editorials = pageData?.items || [];
  const isLoading = status === "loading";
  const totalPages = getTotalPages(pageData, page);

  function goToPage(url, fallbackPage) {
    const pageNumber = getPageNumberFromUrl(url, fallbackPage);

    if (pageNumber) {
      setSearchParams(pageNumber > 1 ? { page: String(pageNumber) } : {});
    }
  }

  return (
    <section className="editorials-page">
      <Container fluid className="editorials-hero">
        <Container className="editorials-shell">
          <div className="editorials-intro">
            <span className="editorials-kicker">Contest Editorials</span>
            <h1>Read every contest breakdown in one place.</h1>
            <p>
              Browse the latest contest editorials, then open any contest to
              see the full write-up and all included questions.
            </p>
          </div>

          {isLoading && !pageData && (
            <div className="editorials-feedback-card">
              Loading editorials...
            </div>
          )}

          {status === "error" && (
            <div className="editorials-feedback-card error">{error}</div>
          )}

          {status === "success" && editorials.length === 0 && (
            <div className="editorials-feedback-card">
              No editorials have been published yet.
            </div>
          )}

          {editorials.length > 0 && (
            <>
              <div className="editorial-grid">
                {editorials.map((editorial) => (
                  <Link
                    key={editorial.id || editorial.slug}
                    className="editorial-card"
                    to={`/editorials/${editorial.slug}${location.search}`}
                  >
                    <div className="editorial-card-topline">
                      <span className="editorial-platform">
                        {getPlatformLabel(editorial.platform)}
                      </span>
                      <span className="editorial-date">
                        {getContestDateLabel(editorial)}
                      </span>
                    </div>

                    <h2>{editorial.contest_name}</h2>

                    <p>
                      {editorial.questions?.length || 0} question
                      {(editorial.questions?.length || 0) === 1 ? "" : "s"} in
                      this editorial.
                    </p>

                    <div className="editorial-card-footer">
                      <span>Open editorial</span>
                      <span className="editorial-arrow">→</span>
                    </div>
                  </Link>
                ))}
              </div>

              <nav className="editorial-pagination" aria-label="Editorial pages">
                <button
                  type="button"
                  className="editorial-page-btn"
                  onClick={() => goToPage(pageData.previous, page - 1)}
                  disabled={!pageData.previous || isLoading}
                >
                  ← Previous
                </button>

                <span className="editorial-page-status">
                  {isLoading
                    ? "Loading..."
                    : `Page ${page}${
                        totalPages !== null ? ` of ${totalPages}` : ""
                      }`}
                </span>

                <button
                  type="button"
                  className="editorial-page-btn"
                  onClick={() => goToPage(pageData.next, page + 1)}
                  disabled={!pageData.next || isLoading}
                >
                  Next →
                </button>
              </nav>
            </>
          )}
        </Container>
      </Container>
    </section>
  );
}

export default EditorialList;
