import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import booksRouter from "./routes/books";
import swaggerUi from "swagger-ui-express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { buildOpenApiDocument } from "./openapi";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const openApiDoc = buildOpenApiDocument();
  app.get("/openapi.json", (_req, res) => res.json(openApiDoc));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

  app.use("/books", booksRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
