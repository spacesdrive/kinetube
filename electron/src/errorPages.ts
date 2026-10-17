const PAGE_STYLE = 'background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:2rem;margin:0';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function asDataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

// shown instead of the app when the backend never answered, with its log so the person can report what happened
export function backendFailurePage(logPath: string, logText: string): string {
  return asDataUrl(`<!DOCTYPE html><html><body style="${PAGE_STYLE}">
    <h2 style="color:#ef4444">The KineTube backend didn't start</h2>
    <p style="color:#94a3b8;margin-bottom:1rem">Restart KineTube. If this keeps happening, report it with this log from <code style="color:#fbbf24">${escapeHtml(logPath)}</code>:</p>
    <pre style="background:#1e293b;padding:1rem;border-radius:8px;overflow:auto;font-size:0.8rem;color:#cbd5e1;white-space:pre-wrap">${escapeHtml(logText)}</pre>
  </body></html>`);
}

export function loadFailurePage(errorCode: number, description: string): string {
  return asDataUrl(`<!DOCTYPE html><html><body style="${PAGE_STYLE};display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center">
      <h2 style="color:#ef4444">The app page didn't load (error ${errorCode})</h2>
      <p style="color:#94a3b8">${escapeHtml(description)}</p>
      <p style="color:#64748b">Restart KineTube. Press F12 for the developer tools.</p>
    </div>
  </body></html>`);
}
