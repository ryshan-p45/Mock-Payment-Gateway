import { createFileRoute } from '@tanstack/react-router'

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nozow API Docs</title>
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

export const Route = createFileRoute('/docs')({
  server: {
    handlers: {
      GET: () => new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    },
  },
})
