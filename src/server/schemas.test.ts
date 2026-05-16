import { describe, it, expect } from "vitest";
import { GrantSchema, RevokeSchema } from "./admin.functions";
import {
  SetPostStatusSchema,
  DeletePostSchema,
  parseSubscribeInput,
} from "./blog.functions";
import {
  RunSearchSchema,
  ToggleAlertSchema,
  ShortlistUpsertSchema,
  AddMemberSchema,
  UpdateStageSchema,
  SequenceUpsertSchema,
  SendOutreachSchema,
  ListSendsSchema,
} from "./sourcing.functions";
import {
  StartSchema,
  RubricUpsertSchema,
  ShareSchema,
  ManualTranscriptSchema,
  BulkSchema,
  ListSchema,
  ScorecardEditSchema,
  ShareExpirySchema,
  SeedSchema,
} from "./interviews.functions";
import { TEST_UUID } from "./test-fixtures";

const UUID = TEST_UUID;

describe("admin schemas", () => {
  it("GrantSchema accepts a valid email", () => {
    expect(GrantSchema.parse({ email: "u@x.com" })).toEqual({ email: "u@x.com" });
  });
  it("GrantSchema rejects invalid email and >255 chars", () => {
    expect(() => GrantSchema.parse({ email: "nope" })).toThrow();
    expect(() => GrantSchema.parse({ email: "a".repeat(250) + "@x.com" })).toThrow();
  });
  it("RevokeSchema requires uuid", () => {
    expect(RevokeSchema.parse({ user_id: UUID })).toEqual({ user_id: UUID });
    expect(() => RevokeSchema.parse({ user_id: "not-a-uuid" })).toThrow();
  });
});

describe("blog schemas", () => {
  it("SetPostStatusSchema accepts valid status", () => {
    expect(SetPostStatusSchema.parse({ id: UUID, status: "published" })).toEqual({
      id: UUID,
      status: "published",
    });
  });
  it("SetPostStatusSchema rejects unknown status", () => {
    expect(() => SetPostStatusSchema.parse({ id: UUID, status: "archived" })).toThrow();
  });
  it("DeletePostSchema requires uuid", () => {
    expect(() => DeletePostSchema.parse({ id: "x" })).toThrow();
  });

  describe("parseSubscribeInput", () => {
    it("normalizes email and source", () => {
      expect(parseSubscribeInput({ email: "  USER@Example.com  " })).toEqual({
        email: "user@example.com",
        source: "blog",
      });
    });
    it("uses provided source, capped at 64 chars", () => {
      const long = "x".repeat(100);
      expect(parseSubscribeInput({ email: "a@b.co", source: long }).source).toHaveLength(64);
    });
    it("throws on invalid email", () => {
      expect(() => parseSubscribeInput({ email: "nope" })).toThrow(/Invalid email/);
      expect(() => parseSubscribeInput({ email: "a@b" })).toThrow(/Invalid email/);
    });
    it("throws when email exceeds 254 chars", () => {
      const huge = "a".repeat(250) + "@b.co";
      expect(() => parseSubscribeInput({ email: huge })).toThrow(/Email too long/);
    });
  });
});

describe("sourcing schemas", () => {
  it("RunSearchSchema accepts a minimal valid input", () => {
    const out = RunSearchSchema.parse({ query: "ai engineer" });
    expect(out.query).toBe("ai engineer");
  });
  it("RunSearchSchema accepts full filters", () => {
    expect(() =>
      RunSearchSchema.parse({
        query: "rust dev",
        source: "github",
        filters: {
          location: "NYC",
          language: "Rust",
          minFollowers: 100,
          minRepos: 5,
          skills: ["rust", "wasm"],
          seniority: "senior",
        },
        limit: 25,
      }),
    ).not.toThrow();
  });
  it("RunSearchSchema rejects too-short query, bad source, bad limit", () => {
    expect(() => RunSearchSchema.parse({ query: "x" })).toThrow();
    expect(() => RunSearchSchema.parse({ query: "go", source: "linkedin" })).toThrow();
    expect(() => RunSearchSchema.parse({ query: "go", limit: 100 })).toThrow();
  });
  it("RunSearchSchema caps skills array length", () => {
    expect(() =>
      RunSearchSchema.parse({
        query: "go",
        filters: { skills: Array(20).fill("x") },
      }),
    ).toThrow();
  });

  it("ToggleAlertSchema validates frequency enum", () => {
    expect(() =>
      ToggleAlertSchema.parse({ searchId: UUID, enabled: true, frequency: "monthly" }),
    ).toThrow();
    expect(() =>
      ToggleAlertSchema.parse({ searchId: UUID, enabled: true, frequency: "daily" }),
    ).not.toThrow();
  });

  it("ShortlistUpsertSchema requires non-empty name", () => {
    expect(() => ShortlistUpsertSchema.parse({ name: "" })).toThrow();
    expect(() => ShortlistUpsertSchema.parse({ name: "Top picks" })).not.toThrow();
  });

  it("AddMemberSchema accepts valid stage and rejects unknown", () => {
    expect(() =>
      AddMemberSchema.parse({ shortlistId: UUID, candidateId: UUID, stage: "contacted" }),
    ).not.toThrow();
    expect(() =>
      AddMemberSchema.parse({ shortlistId: UUID, candidateId: UUID, stage: "ghosted" }),
    ).toThrow();
  });

  it("UpdateStageSchema requires stage", () => {
    expect(() => UpdateStageSchema.parse({ memberId: UUID })).toThrow();
    expect(() =>
      UpdateStageSchema.parse({ memberId: UUID, stage: "passed", notes: null }),
    ).not.toThrow();
  });

  it("SequenceUpsertSchema enforces required fields and lengths", () => {
    expect(() =>
      SequenceUpsertSchema.parse({ name: "n", subject: "s", body: "b" }),
    ).not.toThrow();
    expect(() =>
      SequenceUpsertSchema.parse({ name: "", subject: "s", body: "b" }),
    ).toThrow();
    expect(() =>
      SequenceUpsertSchema.parse({ name: "n", subject: "s", body: "x".repeat(8001) }),
    ).toThrow();
  });

  it("SendOutreachSchema validates email and uuids", () => {
    expect(() =>
      SendOutreachSchema.parse({
        candidateId: UUID,
        sequenceId: UUID,
        recipientEmail: "ok@x.com",
        roleTitle: "Eng",
      }),
    ).not.toThrow();
    expect(() =>
      SendOutreachSchema.parse({
        candidateId: UUID,
        sequenceId: UUID,
        recipientEmail: "nope",
        roleTitle: "Eng",
      }),
    ).toThrow();
  });

  it("ListSendsSchema is fully optional and validates enum", () => {
    expect(ListSendsSchema.parse({})).toEqual({});
    expect(() => ListSendsSchema.parse({ status: "weird" })).toThrow();
    expect(() => ListSendsSchema.parse({ limit: 500 })).toThrow();
  });
});

describe("interview schemas", () => {
  it("StartSchema requires url-shaped meetingUrl", () => {
    expect(() =>
      StartSchema.parse({
        candidateName: "Ada",
        roleTitle: "Eng",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
      }),
    ).not.toThrow();
    expect(() =>
      StartSchema.parse({
        candidateName: "Ada",
        roleTitle: "Eng",
        meetingUrl: "not a url",
      }),
    ).toThrow();
  });

  it("StartSchema rejects empty candidateName", () => {
    expect(() =>
      StartSchema.parse({
        candidateName: "",
        roleTitle: "Eng",
        meetingUrl: "https://zoom.us/j/1",
      }),
    ).toThrow();
  });

  it("RubricUpsertSchema enforces competencies cap", () => {
    expect(() =>
      RubricUpsertSchema.parse({ name: "R", competencies: Array(21).fill("c") }),
    ).toThrow();
    expect(() =>
      RubricUpsertSchema.parse({ name: "R", competencies: ["one"] }),
    ).not.toThrow();
  });

  it("ShareSchema requires boolean enabled and uuid sessionId", () => {
    expect(() => ShareSchema.parse({ sessionId: UUID, enabled: true })).not.toThrow();
    expect(() => ShareSchema.parse({ sessionId: UUID, enabled: "yes" })).toThrow();
  });

  it("ManualTranscriptSchema enforces non-empty content and length caps", () => {
    expect(() =>
      ManualTranscriptSchema.parse({ sessionId: UUID, speaker: "A", content: "hi" }),
    ).not.toThrow();
    expect(() =>
      ManualTranscriptSchema.parse({ sessionId: UUID, speaker: "", content: "hi" }),
    ).toThrow();
    expect(() =>
      ManualTranscriptSchema.parse({
        sessionId: UUID,
        speaker: "A",
        content: "x".repeat(8001),
      }),
    ).toThrow();
  });

  it("BulkSchema accepts large text up to 200k", () => {
    expect(() =>
      BulkSchema.parse({ sessionId: UUID, text: "x".repeat(200000) }),
    ).not.toThrow();
    expect(() =>
      BulkSchema.parse({ sessionId: UUID, text: "x".repeat(200001) }),
    ).toThrow();
  });

  it("ListSchema applies defaults and enforces scope enum", () => {
    expect(ListSchema.parse({})).toEqual({ page: 0, pageSize: 20, scope: "active" });
    expect(() => ListSchema.parse({ scope: "deleted" })).toThrow();
    expect(() => ListSchema.parse({ pageSize: 200 })).toThrow();
  });

  it("ScorecardEditSchema validates ratings and competencies", () => {
    const valid = {
      sessionId: UUID,
      summary: "ok",
      overall_rating: 4,
      recommendation: "hire" as const,
      strengths: ["good"],
      concerns: [],
      competencies: [{ name: "Comm", rating: 5 }],
      follow_ups: [],
    };
    expect(() => ScorecardEditSchema.parse(valid)).not.toThrow();
    expect(() =>
      ScorecardEditSchema.parse({ ...valid, overall_rating: 6 }),
    ).toThrow();
    expect(() =>
      ScorecardEditSchema.parse({ ...valid, recommendation: "maybe" }),
    ).toThrow();
    expect(() =>
      ScorecardEditSchema.parse({
        ...valid,
        competencies: [{ name: "Comm", rating: 0 }],
      }),
    ).toThrow();
  });

  it("ShareExpirySchema bounds expiresInDays", () => {
    expect(() =>
      ShareExpirySchema.parse({ sessionId: UUID, enabled: true, expiresInDays: 7 }),
    ).not.toThrow();
    expect(() =>
      ShareExpirySchema.parse({ sessionId: UUID, enabled: true, expiresInDays: 0 }),
    ).toThrow();
    expect(() =>
      ShareExpirySchema.parse({ sessionId: UUID, enabled: true, expiresInDays: 400 }),
    ).toThrow();
  });

  it("SeedSchema requires at least one valid template", () => {
    expect(() => SeedSchema.parse({ templates: [] })).toThrow();
    expect(() => SeedSchema.parse({ templates: ["engineering"] })).not.toThrow();
    expect(() => SeedSchema.parse({ templates: ["marketing"] })).toThrow();
  });
});