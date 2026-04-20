import request from "supertest";
import { Express } from "express";
import { createApp } from "../app";
import { prisma, disconnect } from "../db";

let app: Express;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await prisma.book.deleteMany({});
});

afterAll(async () => {
  await disconnect();
});

describe("Books API", () => {
  // ─── Create ────────────────────────────────────────────────────────────────
  describe("POST /books", () => {
    it("creates a book with required fields", async () => {
      const res = await request(app)
        .post("/books")
        .send({ title: "The Pragmatic Programmer", author: "Andy Hunt" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: "The Pragmatic Programmer",
        author: "Andy Hunt",
        genre: "OTHER",
        status: "AVAILABLE",
      });
      expect(res.body.id).toBeDefined();
    });

    it("accepts optional fields", async () => {
      const res = await request(app).post("/books").send({
        title: "Sapiens",
        author: "Yuval Noah Harari",
        genre: "HISTORY",
        publishedYear: 2011,
        status: "CHECKED_OUT",
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: "Sapiens",
        author: "Yuval Noah Harari",
        genre: "HISTORY",
        publishedYear: 2011,
        status: "CHECKED_OUT",
      });
    });

    it("returns 400 when title is missing", async () => {
      const res = await request(app).post("/books").send({ author: "x" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("returns 400 when author is missing", async () => {
      const res = await request(app).post("/books").send({ title: "x" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid genre", async () => {
      const res = await request(app)
        .post("/books")
        .send({ title: "x", author: "y", genre: "MANGA" });
      expect(res.status).toBe(400);
    });
  });

  // ─── List ──────────────────────────────────────────────────────────────────
  describe("GET /books", () => {
    beforeEach(async () => {
      await prisma.book.createMany({
        data: [
          { title: "Dune", author: "Frank Herbert", genre: "FICTION", publishedYear: 1965, status: "AVAILABLE" },
          { title: "Sapiens", author: "Yuval Noah Harari", genre: "HISTORY", publishedYear: 2011, status: "AVAILABLE" },
          { title: "A Brief History of Time", author: "Stephen Hawking", genre: "SCIENCE", publishedYear: 1988, status: "CHECKED_OUT" },
        ],
      });
    });

    it("returns all books with pagination meta", async () => {
      const res = await request(app).get("/books");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta).toMatchObject({ total: 3, limit: 20, offset: 0 });
    });

    it("filters by genre", async () => {
      const res = await request(app).get("/books?genre=SCIENCE");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("A Brief History of Time");
    });

    it("filters by status", async () => {
      const res = await request(app).get("/books?status=AVAILABLE");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it("filters by author (partial match)", async () => {
      const res = await request(app).get("/books?author=Hawking");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("searches titles with q", async () => {
      const res = await request(app).get("/books?q=Sapiens");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("filters by year range", async () => {
      const res = await request(app).get("/books?yearFrom=1980&yearTo=2000");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("A Brief History of Time");
    });

    it("rejects yearFrom > yearTo", async () => {
      const res = await request(app).get("/books?yearFrom=2020&yearTo=2000");
      expect(res.status).toBe(400);
    });

    it("paginates via limit & offset", async () => {
      const res = await request(app).get("/books?limit=1&offset=1");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ total: 3, limit: 1, offset: 1 });
    });
  });

  // ─── Get by id ─────────────────────────────────────────────────────────────
  describe("GET /books/:id", () => {
    it("returns an existing book", async () => {
      const created = await prisma.book.create({
        data: { title: "x", author: "y" },
      });
      const res = await request(app).get(`/books/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await request(app).get("/books/999999");
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid id", async () => {
      const res = await request(app).get("/books/not-a-number");
      expect(res.status).toBe(400);
    });
  });

  // ─── Update ────────────────────────────────────────────────────────────────
  describe("PATCH /books/:id", () => {
    it("updates the title", async () => {
      const b = await prisma.book.create({ data: { title: "old", author: "x" } });
      const res = await request(app)
        .patch(`/books/${b.id}`)
        .send({ title: "new" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("new");
    });

    it("updates the status", async () => {
      const b = await prisma.book.create({ data: { title: "x", author: "y" } });
      const res = await request(app)
        .patch(`/books/${b.id}`)
        .send({ status: "CHECKED_OUT" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("CHECKED_OUT");
    });

    it("returns 400 when the body is empty", async () => {
      const b = await prisma.book.create({ data: { title: "x", author: "y" } });
      const res = await request(app).patch(`/books/${b.id}`).send({});
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await request(app)
        .patch("/books/999999")
        .send({ title: "x" });
      expect(res.status).toBe(404);
    });
  });

  // ─── Delete ────────────────────────────────────────────────────────────────
  describe("DELETE /books/:id", () => {
    it("deletes an existing book", async () => {
      const b = await prisma.book.create({ data: { title: "x", author: "y" } });
      const del = await request(app).delete(`/books/${b.id}`);
      expect(del.status).toBe(204);
      const get = await request(app).get(`/books/${b.id}`);
      expect(get.status).toBe(404);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await request(app).delete("/books/999999");
      expect(res.status).toBe(404);
    });
  });

  // ─── Health & docs ─────────────────────────────────────────────────────────
  describe("misc", () => {
    it("GET /health returns ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("GET /openapi.json returns a spec", async () => {
      const res = await request(app).get("/openapi.json");
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe("3.0.0");
      expect(res.body.paths["/books"]).toBeDefined();
    });

    it("unknown route returns 404", async () => {
      const res = await request(app).get("/nope");
      expect(res.status).toBe(404);
    });

    it("malformed JSON body returns 400", async () => {
      const res = await request(app)
        .post("/books")
        .set("Content-Type", "application/json")
        .send("{ not valid json");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Malformed JSON");
    });
  });
});
