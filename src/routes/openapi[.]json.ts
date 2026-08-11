import { createFileRoute } from '@tanstack/react-router'

import { openApiSpec } from '@/lib/nozow/openapi'

export const Route = createFileRoute('/openapi.json')({
  server: {
    handlers: {
      GET: () => Response.json(openApiSpec),
    },
  },
})
