import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));


  return app;
}
