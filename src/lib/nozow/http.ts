export function htmlPage(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Nozow</title><link rel="stylesheet" href="/styles.css" /></head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export function errorPage(title: string, message: string, status = 400): Response {
  return htmlPage(
    `<main class="nozow-error"><span class="badge-mock">MOCK GATEWAY</span><h1>${title}</h1><p>${message}</p></main>`,
    status,
  )
}

/** Parses either a urlencoded/multipart form body or a JSON body into a flat string map. */
export async function parseBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await request.json()
    return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]))
  }
  const form = await request.formData()
  return Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, String(v)]))
}
