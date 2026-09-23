import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as z from 'zod/v4'
import { createClient, ConnectorError, parseBearer } from './linoroute-client.mjs'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const MCP_PATH = process.env.MCP_PATH ?? '/mcp'
const allowedOrigins = new Set((process.env.MCP_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean))
const allowedHosts = (process.env.MCP_ALLOWED_HOSTS ?? 'mcp.linoroute.com,localhost,127.0.0.1').split(',').map((value) => value.trim()).filter(Boolean)
const mediaAllowedHosts = (process.env.MEDIA_ALLOWED_HOSTS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
const mediaMaxBytes = Number(process.env.MEDIA_MAX_BYTES ?? 5 * 1024 * 1024)
const client = createClient({ mediaMaxBytes, mediaAllowedHosts })

function json(value) {
  return JSON.stringify(value, null, 2)
}

function result(value) {
  return { content: [{ type: 'text', text: json(value) }], structuredContent: value }
}

function failure(error) {
  const safe = error instanceof ConnectorError
    ? { error: error.code, message: error.message, status: error.status }
    : { error: 'connector_error', message: 'The Connector could not complete the request.' }
  return { isError: true, content: [{ type: 'text', text: json(safe) }], structuredContent: safe }
}

function createServerForToken(token) {
  const server = new McpServer(
    { name: 'linoroute-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  server.registerTool(
    'linoroute_list_models',
    {
      description: 'List image and video models available to the caller’s LinoRoute API key.',
      inputSchema: {},
    },
    async () => {
      try {
        return result({ models: await client.listModels(token) })
      } catch (error) {
        return failure(error)
      }
    }
  )

  server.registerTool(
    'linoroute_generate_image',
    {
      description: 'Generate or edit an image with LinoRoute. Use reference_urls for HTTPS OSS/CDN images when doing image-to-image.',
      inputSchema: {
        prompt: z.string().min(1).max(32000).describe('Image description.'),
        model: z.string().default('auto').describe('Explicit LinoRoute model ID or auto.'),
        preference: z.enum(['price', 'speed', 'quality']).default('price'),
        aspect_ratio: z.string().optional().describe('For example 1:1, 16:9, or 9:16.'),
        size: z.string().optional().describe('Model-supported pixel size or 1K/2K/4K alias.'),
        quality: z.enum(['auto', 'low', 'medium', 'high', 'xhigh', 'max']).optional(),
        format: z.enum(['png', 'jpeg', 'webp']).optional(),
        background: z.enum(['auto', 'opaque', 'transparent']).optional(),
        moderation: z.enum(['auto', 'low']).optional(),
        n: z.number().int().min(1).max(10).default(1),
        response_format: z.enum(['url', 'b64_json']).default('url'),
        reference_urls: z.array(z.string().url()).max(4).default([]),
      },
    },
    async (input) => {
      try {
        return result(await client.createImage(token, input))
      } catch (error) {
        return failure(error)
      }
    }
  )

  server.registerTool(
    'linoroute_generate_video',
    {
      description: 'Create a text-to-video or image-to-video task with LinoRoute.',
      inputSchema: {
        prompt: z.string().min(1).max(32000).describe('Video description.'),
        model: z.string().default('auto').describe('Explicit LinoRoute model ID or auto.'),
        preference: z.enum(['price', 'speed', 'quality']).default('price'),
        aspect_ratio: z.string().optional().describe('For example 16:9, 9:16, or 1:1.'),
        resolution: z.string().optional().describe('Model-supported resolution such as 1080p, 2K, or 4K.'),
        duration_seconds: z.number().int().min(1).max(60).default(5),
        generate_audio: z.boolean().optional(),
        reference_url: z.string().url().optional().describe('HTTPS first-frame or reference image URL.'),
      },
    },
    async (input) => {
      try {
        return result(await client.createVideo(token, input))
      } catch (error) {
        return failure(error)
      }
    }
  )

  server.registerTool(
    'linoroute_get_video_task',
    {
      description: 'Poll an existing LinoRoute video task. Use this instead of submitting a duplicate task.',
      inputSchema: {
        model: z.string().min(1),
        task_id: z.string().min(1).max(240),
        image_to_video: z.boolean().default(false),
      },
    },
    async (input) => {
      try {
        return result(await client.getVideoTask(token, input))
      } catch (error) {
        return failure(error)
      }
    }
  )

  return server
}

function applyCors(req, res) {
  const origin = req.headers.origin
  if (origin && (allowedOrigins.size === 0 || allowedOrigins.has(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID')
    res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id, Last-Event-ID')
  }
}

export function createApp() {
  const app = createMcpExpressApp({ host: HOST, allowedHosts })
  app.disable?.('x-powered-by')
  app.use((req, res, next) => {
    applyCors(req, res)
    if (req.method === 'OPTIONS') return res.status(204).end()
    return next()
  })
  app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'linoroute-mcp' }))
  app.get('/', (_req, res) => res.json({ service: 'linoroute-mcp', endpoint: MCP_PATH }))

  app.post(MCP_PATH, async (req, res) => {
    const token = parseBearer(req.headers.authorization)
    const server = createServerForToken(token)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      void transport.close()
      void server.close()
    })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (error) {
      console.error('MCP request failed:', error instanceof ConnectorError ? error.code : 'internal_error')
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null })
      }
    }
  })

  app.get(MCP_PATH, (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Use POST for stateless Streamable HTTP.' }, id: null }))
  app.delete(MCP_PATH, (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Stateless sessions cannot be deleted.' }, id: null }))
  return app
}

export function startServer({ port = PORT, host = HOST } = {}) {
  const app = createApp()
  const listener = app.listen(port, host, () => {
    const shownHost = host === '0.0.0.0' ? 'localhost' : host
    console.log(`LinoRoute MCP listening on http://${shownHost}:${listener.address().port}${MCP_PATH}`)
  })
  listener.on('error', (error) => {
    console.error('Failed to start MCP server:', error.message)
    process.exitCode = 1
  })
  return listener
}

const isMain = process.argv[1]
  && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(path.resolve(process.argv[1]))
if (isMain) startServer()
