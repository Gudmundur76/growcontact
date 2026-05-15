import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dbError, DbError } from "./db-errors";

describe("dbError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const cases: Array<{ code: string; message: string; status: number }> = [
    { code: "23505", message: "That already exists.", status: 409 },
    { code: "23503", message: "Related record is missing or in use.", status: 409 },
    { code: "23502", message: "A required field is missing.", status: 400 },
    { code: "23514", message: "Value is not allowed.", status: 400 },
    { code: "22001", message: "Value is too long.", status: 400 },
    { code: "22P02", message: "Invalid input format.", status: 400 },
    { code: "42501", message: "You do not have permission to do that.", status: 403 },
    { code: "42P01", message: "Resource is unavailable.", status: 500 },
    { code: "PGRST116", message: "Not found.", status: 404 },
    { code: "PGRST301", message: "Please sign in and try again.", status: 401 },
    { code: "PGRST302", message: "You do not have permission to do that.", status: 403 },
    { code: "40001", message: "Please try again.", status: 409 },
    { code: "40P01", message: "Please try again.", status: 409 },
    { code: "57014", message: "The request took too long. Please try again.", status: 504 },
    { code: "53300", message: "Service is busy. Please try again shortly.", status: 503 },
  ];

  it.each(cases)("maps $code to safe message + status", ({ code, message, status }) => {
    const err = dbError({ code, message: "raw db detail leak" }, "test");
    expect(err).toBeInstanceOf(DbError);
    expect(err.message).toBe(message);
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.name).toBe("DbError");
  });

  it("falls back to generic message + 500 for unknown codes", () => {
    const err = dbError({ code: "99999", message: "weird" }, "test");
    expect(err.message).toBe("Something went wrong. Please try again.");
    expect(err.status).toBe(500);
    expect(err.code).toBe("99999");
  });

  it("uses custom fallback when provided", () => {
    const err = dbError({ code: "99999" }, "test", "Custom oops.");
    expect(err.message).toBe("Custom oops.");
    expect(err.status).toBe(500);
  });

  it("detects RLS denial by message when code is missing", () => {
    const err = dbError(
      { message: "new row violates row-level security policy for table x" },
      "test",
    );
    expect(err.message).toBe("You do not have permission to do that.");
    expect(err.status).toBe(403);
    expect(err.code).toBe("42501");
  });

  it("preserves original code on RLS message detection when present", () => {
    const err = dbError(
      { code: "XYZ12", message: "row-level security violation" },
      "test",
    );
    expect(err.status).toBe(403);
    expect(err.code).toBe("XYZ12");
  });

  it("handles null/undefined error inputs without throwing", () => {
    const err = dbError(null, "test");
    expect(err).toBeInstanceOf(DbError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Something went wrong. Please try again.");
  });

  it("logs raw error details server-side (not surfaced to user)", () => {
    const spy = vi.spyOn(console, "error");
    dbError(
      { code: "23505", message: "duplicate key", details: "Key (email)=(a@b.com)", hint: "use upsert" },
      "users:insert",
    );
    expect(spy).toHaveBeenCalledWith(
      "[db] users:insert:",
      expect.objectContaining({
        message: "duplicate key",
        code: "23505",
        details: "Key (email)=(a@b.com)",
        hint: "use upsert",
      }),
    );
  });

  it("DbError instances are throwable and catchable as Error", () => {
    try {
      throw dbError({ code: "PGRST116" }, "test");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(DbError);
      expect((e as DbError).status).toBe(404);
    }
  });
});