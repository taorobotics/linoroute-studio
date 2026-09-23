import test from 'node:test'
import assert from 'node:assert/strict'
import {
  chooseModel,
  classifyModel,
  normalizeBaseUrl,
  normalizeImageResult,
  normalizeVideoResult,
  parseBearer,
} from '../src/linoroute-client.mjs'

test('normalizes the upstream base URL without a /v1 suffix', () => {
  assert.equal(normalizeBaseUrl('https://linoroute.com/v1/'), 'https://linoroute.com')
  assert.throws(() => normalizeBaseUrl('http://api.example.com'), /HTTPS/)
})

test('accepts ordinary bearer tokens but never whitespace', () => {
  assert.equal(parseBearer('Bearer sk-test_123'), 'sk-test_123')
  assert.equal(parseBearer('Basic sk-test_123'), '')
  assert.equal(parseBearer('Bearer sk-test 123'), '')
})

test('classifies and chooses only models available to the caller', () => {
  assert.equal(classifyModel('gpt-image-2.5-flare', 'image'), true)
  assert.equal(classifyModel('doubao-seedance-2-5-260628', 'video'), true)
  assert.equal(classifyModel('gpt-image-2.5-flare', 'video'), false)
  assert.equal(chooseModel(['gpt-image-2.5-sunburst', 'gpt-image-2'], 'image', 'quality'), 'gpt-image-2.5-sunburst')
  assert.equal(chooseModel(['doubao-seedance-2-0-260128'], 'video', 'price'), 'doubao-seedance-2-0-260128')
})

test('normalizes image assets without returning the raw upstream payload', () => {
  assert.deepEqual(normalizeImageResult({ data: [{ url: 'https://cdn.example.com/image.png' }] }), {
    status: 'ready',
    assets: [{ url: 'https://cdn.example.com/image.png' }],
  })
  assert.deepEqual(normalizeImageResult({ unexpected: 'private details' }), { status: 'unknown', assets: [] })
})

test('normalizes video task and output states', () => {
  assert.deepEqual(normalizeVideoResult({ data: { id: 'task_123', status: 'processing' } }), {
    status: 'running', task_id: 'task_123', assets: [],
  })
  assert.deepEqual(normalizeVideoResult({ data: { status: 'succeeded', Output: { FileUrl: 'https://cdn.example.com/video.mp4' } } }), {
    status: 'ready', assets: [{ url: 'https://cdn.example.com/video.mp4' }],
  })
})
