// Shared fetch() helpers for the backend's plain request/response endpoints.
// SSE streams stay colocated with the component that renders their progress
// (see DECISIONS.md ADR-006 and ADR-016) - this module only covers the
// request/JSON-response shape duplicated across components.

export function postRequest(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteRequest(path) {
  return fetch(path, { method: 'DELETE' });
}

// GET + parse JSON body. No status check - several backend routes always
// answer 200 with a status/valid/path field even on a logical failure, so
// callers read the body directly rather than relying on res.ok.
export async function getJSON(path) {
  const res = await fetch(path);
  return res.json();
}

// POST + parse JSON body, same no-throw contract as getJSON.
export async function postJSON(path, body) {
  const res = await postRequest(path, body);
  return res.json();
}

// POST + parse JSON body, throwing on a non-2xx response using this
// backend's shared error shape ({ error, hint?, detail? }).
export async function postJSONStrict(path, body, fallbackMessage = 'Request failed.') {
  const res = await postRequest(path, body);
  const data = await res.json();
  if (!res.ok) {
    const parts = [data.error, data.hint, data.detail].filter(Boolean);
    throw new Error(parts.join(' — ') || fallbackMessage);
  }
  return data;
}
