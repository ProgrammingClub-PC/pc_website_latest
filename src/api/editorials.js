const API_BASE_URL = process.env.REACT_APP_EDITORIALS_API_BASE_URL;

function getEndpoint(pathname) {
  return `${API_BASE_URL.replace(/\/$/, "")}${pathname}`;
}

async function parseResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function normalizePage(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      count: payload.length,
      next: null,
      previous: null,
    };
  }

  return {
    items: payload?.results || [],
    count: typeof payload?.count === "number" ? payload.count : null,
    next: payload?.next || null,
    previous: payload?.previous || null,
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  return parseResponse(response);
}

export async function fetchEditorialsPage(urlOrPage) {
  const url =
    typeof urlOrPage === "number"
      ? getEndpoint(`/editorials/?page=${urlOrPage}`)
      : urlOrPage || getEndpoint("/editorials/");
  const payload = await fetchJson(url);
  return normalizePage(payload);
}

export async function fetchAllEditorials() {
  let nextUrl = getEndpoint("/editorials/");
  const collected = [];
  let pageCount = 0;

  while (nextUrl && pageCount < 50) {
    const payload = await fetchJson(nextUrl);
    const { items, next } = normalizePage(payload);

    collected.push(...items);
    nextUrl = next;
    pageCount += 1;
  }

  return collected;
}

export async function fetchEditorialBySlug(slug) {
  try {
    const detailPayload = await fetchJson(getEndpoint(`/editorials/${slug}/`));

    if (!detailPayload?.slug || detailPayload.slug === slug) {
      return detailPayload;
    }
  } catch (error) {
    // Fall back to archive lookup if the backend detail route uses a different lookup field.
  }

  const editorials = await fetchAllEditorials();
  const match = editorials.find((editorial) => editorial.slug === slug);

  if (!match) {
    throw new Error("Editorial not found");
  }

  return match;
}

export function getPlatformLabel(platform) {
  const labels = {
    CF: "Codeforces",
    CC: "CodeChef",
    LC: "LeetCode",
  };

  return labels[platform] || platform || "Contest";
}
