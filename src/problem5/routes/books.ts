import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { CreateBookSchema, IdParamSchema, ListBooksQuerySchema, UpdateBookSchema } from "../schemas/book";
import { prisma } from "../db";
import { Prisma } from "../prisma/generated/client";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

function serialise<T extends { createdAt: Date; updatedAt: Date }>(book: T) {
  return {
    ...book,
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString()
  }
}

function throwIfNotFound(err: unknown, id: number): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2025"
  ) {
    throw new HttpError(404, `Book ${id} not found`);
  }
  throw err;
}

router.post("/", asyncHandler(async (req, res) => {
  const data = CreateBookSchema.parse(req.body);
  const book = await prisma.book.create({ data });
  res.status(201).json(serialise(book));
}))

router.get("/", asyncHandler(async (req, res) => {
  const { genre, status, author, q, yearFrom, yearTo, limit, offset } = ListBooksQuerySchema.parse(req.query);

  const where: Prisma.BookWhereInput = {};
  if (genre) where.genre = genre;
  if (status) where.status = genre;
  if (author) where.author = author;
  if (q) where.title = { contains: q };

  if (yearFrom !== undefined || yearTo !== undefined) {
    where.publishedYear = {
      ...(yearFrom !== undefined && { gte: yearFrom }),
      ...(yearTo !== undefined && { lte: yearTo })
    };
  }

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.book.count({ where })
  ]);

  res.json({
    data: items.map(serialise),
    meta: { total, limit, offset }
  });
}))

router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = IdParamSchema.parse(req.params);
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw new HttpError(404, `Book ${id} not found`);
  res.json(serialise(book));
}))

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = IdParamSchema.parse(req.params);
  const data = UpdateBookSchema.parse(req.body);

  try {
    const book = await prisma.book.update({ where: { id }, data });
    res.json(serialise(book));
  } catch (err) {
    throwIfNotFound(err, id);
  }
}))

router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = IdParamSchema.parse(req.params);

  try {
    await prisma.book.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    throwIfNotFound(err, id);
  }
}))

export default router;
