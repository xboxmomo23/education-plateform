import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

type RequestWithId = Request & { requestId?: string };

const REQUEST_ID_HEADER = "x-request-id";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const incomingHeader = req.header(REQUEST_ID_HEADER);
  const requestId =
    incomingHeader && incomingHeader.trim().length > 0
      ? incomingHeader.trim()
      : crypto.randomUUID();

  (req as RequestWithId).requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
}
