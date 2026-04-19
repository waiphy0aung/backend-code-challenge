import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "../prisma/generated/client";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message
      }))
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // express.json() throws a SyntaxError with a `body` property for bad JSON.
  if (
    err instanceof SyntaxError &&
    "body" in err &&
    "status" in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({ error: "Malformed JSON" })
    return;
  }


  // Body exceeded the json() size limit.
  if (
    err instanceof Error &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json({ error: "Request body too large" })
    return;
  }

  // Prisma unique-constraint violation.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    res.status(409).json({ error: "Resource already exists" });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
