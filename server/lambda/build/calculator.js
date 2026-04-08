function calculate(expression) {
  if (typeof expression !== 'string') {
    throw new Error('Expression must be a string')
  }

  const normalized = expression
    .trim()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/x/g, '*')
    .replace(/−/g, '-')
    .replace(/＋/g, '+')

  if (!normalized) {
    throw new Error('Expression is empty')
  }

  if (/[^-+*/%.()\d\s.]/.test(normalized)) {
    throw new Error('Invalid characters in expression')
  }

  let index = 0

  function peek() {
    return normalized[index]
  }

  function consume(expected) {
    if (normalized[index] === expected) {
      index += 1
      return true
    }
    return false
  }

  function skipWhitespace() {
    while (index < normalized.length && /\s/.test(normalized[index])) {
      index += 1
    }
  }

  function parseExpression() {
    let value = parseTerm()

    while (true) {
      skipWhitespace()
      const op = peek()
      if (op === '+' || op === '-') {
        index += 1
        const right = parseTerm()
        if (op === '+') {
          value += right
        } else {
          value -= right
        }
      } else {
        break
      }
    }

    return value
  }

  function parseTerm() {
    let value = parseUnary()

    while (true) {
      skipWhitespace()
      const op = peek()
      if (op === '*' || op === '/' || op === '%') {
        index += 1
        const right = parseUnary()
        if (op === '*') {
          value *= right
        } else if (op === '/') {
          value /= right
        } else {
          value %= right
        }
      } else {
        break
      }
    }

    return value
  }

  function parseUnary() {
    skipWhitespace()

    if (consume('+')) {
      return parseUnary()
    }

    if (consume('-')) {
      return -parseUnary()
    }

    return parsePrimary()
  }

  function parsePrimary() {
    skipWhitespace()
    const char = peek()

    if (char === '(') {
      index += 1
      const value = parseExpression()
      skipWhitespace()
      if (!consume(')')) {
        throw new Error('Missing closing parenthesis')
      }
      return value
    }

    return parseNumber()
  }

  function parseNumber() {
    skipWhitespace()
    const start = index
    let hasDigit = false
    let hasDot = false

    while (index < normalized.length) {
      const current = normalized[index]
      if (/[0-9]/.test(current)) {
        hasDigit = true
        index += 1
        continue
      }
      if (current === '.') {
        if (hasDot) {
          throw new Error('Invalid decimal format')
        }
        hasDot = true
        index += 1
        continue
      }
      break
    }

    if (!hasDigit) {
      throw new Error('Expected number')
    }

    const text = normalized.slice(start, index)
    if (text === '.') {
      throw new Error('Invalid decimal format')
    }

    return Number.parseFloat(text)
  }

  const result = parseExpression()

  skipWhitespace()
  if (index < normalized.length) {
    throw new Error('Unexpected token')
  }

  if (!Number.isFinite(result)) {
    throw new Error('Invalid calculation')
  }

  const normalizedResult = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(10)).toString()
  return normalizedResult
}

module.exports = { calculate }
