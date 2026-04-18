import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from "./sumToN";

const variants = [
  { label: "iterative", fn: sum_to_n_a },
  { label: "closed-form", fn: sum_to_n_b },
  { label: "recursive", fn: sum_to_n_c },
];

describe.each(variants)("sum_to_n ($label)", ({ fn }) => {
  test("n = 0 returns 0", () => {
    expect(fn(0)).toBe(0);
  });

  test("negative n returns 0", () => {
    expect(fn(-1)).toBe(0);
    expect(fn(-100)).toBe(0);
  });

  test("n = 1 returns 1", () => {
    expect(fn(1)).toBe(1);
  });

  test("n = 5 returns 15 (the example)", () => {
    expect(fn(5)).toBe(15);
  });

  test("n = 10 returns 55", () => {
    expect(fn(10)).toBe(55);
  });

  test("n = 100 returns 5050", () => {
    expect(fn(100)).toBe(5050);
  });

  test("n = 1000 returns 500500", () => {
    expect(fn(1000)).toBe(500500);
  });
});

describe("cross-check: every variant returns the same value", () => {
  test.each([0, 1, 2, 5, 10, 50, 100, 500, 1000])("n = %i", (n) => {
    expect(sum_to_n_a(n)).toBe(sum_to_n_b(n));
    expect(sum_to_n_b(n)).toBe(sum_to_n_c(n));
  });
});
