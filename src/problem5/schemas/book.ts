import z from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

extendZodWithOpenApi(z);

export const BookGenre = z.enum(["FICTION", "NON_FICTION", "SCIENCE", "HISTORY", "BIOGRAPHY", "OTHER"]).openapi({ example: "FICTION" })

export const BookStatus = z.enum(["AVAILABLE", "CHECKED_OUT"]).openapi({ example: "FICTION" });

export const BookSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    title: z.string().openapi({ example: "The Pragmatic Programmer" }),
    author: z.string().openapi({ example: "Andy Hunt" }),
    genre: BookGenre,
    publishedYear: z.number().int().nullable().openapi({ example: 1999 }),
    status: BookStatus,
    createdAt: z.string().datetime().openapi({ example: "2024-01-01T12:00:00.000Z" }),
    updatedAt: z.string().datetime().openapi({ example: "2024-01-01T12:00:00.000Z" })
  })
  .openapi("Book");

// Allow a bit of runway for upcoming publications.
const MAX_YEAR = new Date().getFullYear() + 5;

export const CreateBookSchema = z
  .object({
    title: z.string().trim().min(1, "title is required").max(300),
    author: z.string().trim().min(1, "author is required").max(200),
    genre: BookGenre.optional(),
    publishedYear: z.number().int().min(0).max(MAX_YEAR).nullable().optional(),
    status: BookStatus.optional()
  })
  .openapi("CreateBookInput");

export type CreateBookInput = z.infer<typeof CreateBookSchema>;

export const UpdateBookSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    author: z.string().trim().min(1).max(200).optional(),
    genre: BookGenre.optional(),
    publishedYear: z.number().int().min(0).max(MAX_YEAR).nullable().optional(),
    status: BookStatus.optional()
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least on field must be provided"
  })
  .openapi("UpdateBookInput")

export type UpdateBookInput = z.infer<typeof UpdateBookSchema>;

export const ListBooksQuerySchema = z.object({
  genre: BookGenre.optional(),
  status: BookStatus.optional(),
  author: z.string().trim().min(1).max(200).optional(),
  q: z.string().trim().min(1).max(300).optional(),
  yearFrom: z.coerce.number().int().min(0).max(MAX_YEAR).optional(),
  yearTo: z.coerce.number().int().min(0).max(MAX_YEAR).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(1).default(0)
}).refine(
  (q) => q.yearFrom === undefined || q.yearTo === undefined || q.yearFrom <= q.yearTo,
  { message: "yearFrom must be less than or equal to yearTo", path: ["yearFrom"] }
).openapi("ListBooksQuery");

export type ListBooksQuery = z.infer<typeof ListBooksQuerySchema>;

export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const ErrorSchema = z
  .object({
    error: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .openapi("Error");
