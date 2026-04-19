import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import booksRouter from "./routes/books";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/books", booksRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
