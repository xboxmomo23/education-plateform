import { Request, Response, NextFunction } from 'express'
import { DEMO_MODE } from '../config/demo'
import { demoResponses, DemoResponseBody } from '../demo/sampleData'

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
const ALLOWED_MUTATION_PATHS = [/^\/api\/auth\//]

export function demoReadOnlyGuard(req: Request, res: Response, next: NextFunction) {
  if (!DEMO_MODE) {
    return next()
  }

  if (SAFE_METHODS.includes(req.method.toUpperCase())) {
    return next()
  }

  if (ALLOWED_MUTATION_PATHS.some((regex) => regex.test(req.originalUrl || req.path))) {
    return next()
  }

  return res.status(403).json({
    success: false,
    error: 'Mode démonstration actif : opérations d’écriture désactivées.',
  })
}

export function demoDataMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!DEMO_MODE || req.method.toUpperCase() !== 'GET') {
    return next()
  }

  const match = demoResponses.find(
    (entry) => entry.method === req.method && entry.pattern.test(req.originalUrl || req.path)
  )
  if (!match) {
    return next()
  }

  const body = match.body as DemoResponseBody | ((req: Request) => unknown)
  const responseBody = typeof body === 'function' ? body(req) : body

  return res.json(responseBody)
}
