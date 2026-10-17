// the brand's dark ground and text tokens, inline because these pages load before the frontend
const PAGE_STYLE = 'background:#161416;color:#f2eeea;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:2rem;margin:0';
const MUTED = '#a8a1a6';
const ERROR = '#ff7a70';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function asDataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

// shown instead of the app when the backend never answered, with its log so the person can report what happened
export function backendFailurePage(logPath: string, logText: string): string {
  return asDataUrl(`<!DOCTYPE html><html><body style="${PAGE_STYLE}">
    <h2 style="color:${ERROR};font-weight:600">The kinetube backend didn't start</h2>
    <p style="color:${MUTED};margin-bottom:1rem">Restart kinetube. If this keeps happening, report it with this log from <code style="color:#ff8a62">${escapeHtml(logPath)}</code>:</p>
    <pre style="background:#211e21;padding:1rem;border-radius:16px;overflow:auto;font-size:0.8rem;color:#f2eeea;white-space:pre-wrap">${escapeHtml(logText)}</pre>
  </body></html>`);
}

export function loadFailurePage(errorCode: number, description: string): string {
  return asDataUrl(`<!DOCTYPE html><html><body style="${PAGE_STYLE};display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center">
      <h2 style="color:${ERROR};font-weight:600">The app page didn't load (error ${errorCode})</h2>
      <p style="color:${MUTED}">${escapeHtml(description)}</p>
      <p style="color:${MUTED}">Restart kinetube. Press F12 for the developer tools.</p>
    </div>
  </body></html>`);
}
