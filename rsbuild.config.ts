/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

import { relayRequest } from './src/studio-preview/live-relay'
import { relayStorageRequest } from './src/studio-preview/storage-relay'

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/studio-preview/main.tsx',
    },
  },
  html: {
    template: './studio-preview.html',
    title: 'LinoRoute Studio · AI creative workspace',
    favicon: './public/landing/lino-mark-v2.svg',
  },
  server: {
    host: '127.0.0.1',
    port: 4178,
    strictPort: true,
  },
  dev: {
    setupMiddlewares: (middlewares) => {
      middlewares.unshift(async (req, res, next) => {
        if (req.url?.startsWith('/studio-storage/')) {
          if (req.headers.host !== '127.0.0.1:4178') {
            res.writeHead(403)
            res.end()
            return
          }
          try {
            const chunks: Buffer[] = []
            let size = 0
            for await (const chunk of req) {
              const data = Buffer.from(chunk)
              size += data.length
              if (size > 8 * 1024) {
                res.writeHead(413)
                res.end()
                return
              }
              chunks.push(data)
            }
            const headers = new Headers()
            for (const name of ['authorization', 'content-type', 'origin']) {
              const value = req.headers[name]
              if (typeof value === 'string') headers.set(name, value)
            }
            const response = await relayStorageRequest(
              new Request(`http://127.0.0.1:4178${req.url}`, {
                method: req.method,
                headers,
                body: chunks.length
                  ? new Uint8Array(Buffer.concat(chunks))
                  : undefined,
              })
            )
            res.writeHead(response.status, Object.fromEntries(response.headers))
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch {
            if (!res.headersSent) res.writeHead(502)
            res.end()
          }
          return
        }
        if (!req.url?.startsWith('/studio-api/')) {
          next()
          return
        }
        if (req.headers.host !== '127.0.0.1:4178') {
          res.writeHead(403)
          res.end()
          return
        }
        const controller = new AbortController()
        res.on('close', () => {
          if (!res.writableEnded) controller.abort()
        })
        try {
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of req) {
            const data = Buffer.from(chunk)
            size += data.length
            if (size > 30 * 1024 * 1024) {
              res.writeHead(413)
              res.end()
              return
            }
            chunks.push(data)
          }
          const headers = new Headers()
          for (const name of [
            'authorization',
            'content-type',
            'origin',
            'sec-fetch-site',
          ]) {
            const value = req.headers[name]
            if (typeof value === 'string') headers.set(name, value)
          }
          const body = chunks.length
            ? new Uint8Array(Buffer.concat(chunks))
            : undefined
          const request = new Request(`http://127.0.0.1:4178${req.url}`, {
            method: req.method,
            headers,
            body,
            signal: controller.signal,
          })
          const response = await relayRequest(request)
          res.writeHead(response.status, Object.fromEntries(response.headers))
          if (response.body) {
            const reader = response.body.getReader()
            while (!res.destroyed) {
              const item = await reader.read()
              if (item.done) break
              res.write(Buffer.from(item.value))
            }
            if (res.destroyed) await reader.cancel()
          }
          res.end()
        } catch {
          if (!res.headersSent) res.writeHead(502)
          res.end()
        }
      })
    },
  },
  output: {
    distPath: {
      root: 'dist-studio-preview',
      favicon: 'landing',
    },
  },
})
