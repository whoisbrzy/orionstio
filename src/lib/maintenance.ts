const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function maintenanceHtml(message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#000000"><meta name="color-scheme" content="dark"><meta name="robots" content="noindex"><title>Orion, back soon</title>
<style>*{box-sizing:border-box}html,body{height:100%;margin:0}body{display:grid;place-items:center;padding:1.5rem;background:#000;color:#fff;font-family:"DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}main{max-width:32rem}img{width:min(16rem,70vw);height:auto;margin:0 auto 2.5rem;display:block}h1{font-size:clamp(2rem,7vw,3.25rem);letter-spacing:-.03em;line-height:1.05;margin:0 0 1rem;font-weight:600}p{margin:0;color:#a3a3a3;font-size:1.0625rem;line-height:1.5}</style></head>
<body><main><img src="/orion-wordmark.webp" alt="Orion" width="480" height="140"><h1>Back soon.</h1><p>${escape(message)}</p></main></body></html>`;
}
