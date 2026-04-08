import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { calculate } = require('./calculator.js')

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST'
    },
    body: JSON.stringify(payload)
  }
}

export const handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS' || event?.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  try {
    const body = typeof event?.body === 'string' ? JSON.parse(event.body) : event?.body || {}
    const result = calculate(body.expression)
    return jsonResponse(200, { result })
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to evaluate expression'
    })
  }
}
