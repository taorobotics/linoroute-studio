import test from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from '../src/server.mjs'

test('serves health and a stateless MCP initialize request', async (t) => {
  const listener = startServer({ port: 0, host: '127.0.0.1' })
  t.after(() => listener.close())
  await new Promise((resolve, reject) => {
    listener.once('listening', resolve)
    listener.once('error', reject)
  })
  const port = listener.address().port

  const health = await fetch(`http://127.0.0.1:${port}/healthz`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { ok: true, service: 'linoroute-mcp' })

  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk-test-connector',
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '0.0.0' },
      },
    }),
  })
  assert.equal(response.status, 200)
  assert.match(await response.text(), /linoroute-mcp/)
})
