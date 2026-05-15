import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { detectPlatform, verifyRecallSignature } from "./recall.server";

describe("detectPlatform", () => {
  it.each([
    ["https://us02web.zoom.us/j/12345", "zoom"],
    ["https://Zoom.com/j/abc", "zoom"],
    ["https://meet.google.com/abc-defg-hij", "google_meet"],
    ["https://teams.microsoft.com/l/meetup-join/xyz", "microsoft_teams"],
    ["https://teams.live.com/meet/abc", "microsoft_teams"],
    ["https://example.com/call", "unknown"],
    ["", "unknown"],
  ])("maps %s -> %s", (url, expected) => {
    expect(detectPlatform(url)).toBe(expected);
  });
});

describe("verifyRecallSignature", () => {
  const SECRET = "test-secret";
  const body = JSON.stringify({ event: "bot.status_change", data: { id: "x" } });
  const sign = (s: string, b: string) => createHmac("sha256", s).update(b).digest("hex");

  beforeEach(() => {
    process.env.RECALL_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.RECALL_WEBHOOK_SECRET;
  });

  it("accepts a valid signature", () => {
    expect(verifyRecallSignature(body, sign(SECRET, body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyRecallSignature(body + "!", sign(SECRET, body))).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(verifyRecallSignature(body, sign("other-secret", body))).toBe(false);
  });

  it("rejects when signature is missing", () => {
    expect(verifyRecallSignature(body, null)).toBe(false);
  });

  it("rejects when secret is not configured", () => {
    delete process.env.RECALL_WEBHOOK_SECRET;
    expect(verifyRecallSignature(body, sign(SECRET, body))).toBe(false);
  });

  it("rejects signatures of differing length without throwing", () => {
    expect(verifyRecallSignature(body, "deadbeef")).toBe(false);
  });
});