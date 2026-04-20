import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  BookSchema,
  CreateBookSchema,
  ErrorSchema,
  IdParamSchema,
  ListBooksQuerySchema,
  UpdateBookSchema,
} from "./schemas/book";

const registry = new OpenAPIRegistry();

registry.register("Book", BookSchema);
registry.register("CreateBookInput", CreateBookSchema);
registry.register("UpdateBookInput", UpdateBookSchema);
registry.register("Error", ErrorSchema);

const ListResponse = z.object({
  data: z.array(BookSchema),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }),
});

registry.registerPath({
  method: "post",
  path: "/books",
  summary: "Create a book",
  request: {
    body: { content: { "application/json": { schema: CreateBookSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: BookSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/books",
  summary: "List books",
  request: { query: ListBooksQuerySchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: ListResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/books/{id}",
  summary: "Get a book by id",
  request: { params: IdParamSchema },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: BookSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/books/{id}",
  summary: "Update a book",
  request: {
    params: IdParamSchema,
    body: { content: { "application/json": { schema: UpdateBookSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: BookSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/books/{id}",
  summary: "Delete a book",
  request: { params: IdParamSchema },
  responses: {
    204: { description: "No content" },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Books API",
      version: "1.0.0",
      description: "CRUD API for books (99Tech Code Challenge — Problem 5).",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
