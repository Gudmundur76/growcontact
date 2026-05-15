import { describe, it, expect } from "vitest";
import { buildGithubQuery, buildPdlQuery } from "./sourcing.server";

describe("buildGithubQuery", () => {
  it("always appends type:user and trims the query", () => {
    expect(buildGithubQuery({ query: "  rust hacker  " })).toBe("rust hacker type:user");
  });

  it("quotes location and applies optional filters", () => {
    const q = buildGithubQuery({
      query: "react",
      location: "Berlin, DE",
      language: "TypeScript",
      minFollowers: 50,
      minRepos: 10,
    });
    expect(q).toBe(
      'react location:"Berlin, DE" language:TypeScript followers:>=50 repos:>=10 type:user',
    );
  });

  it("ignores zero/negative thresholds and null filters", () => {
    const q = buildGithubQuery({
      query: "go",
      location: null,
      language: null,
      minFollowers: 0,
      minRepos: null,
    });
    expect(q).toBe("go type:user");
  });

  it("handles an empty query", () => {
    expect(buildGithubQuery({ query: "   " })).toBe("type:user");
  });
});

describe("buildPdlQuery", () => {
  it("emits should-clauses for the free-text query", () => {
    const out = buildPdlQuery({ query: "staff platform engineer" });
    const should = out.query.bool.should as { match: Record<string, string> }[];
    expect(should).toHaveLength(4);
    expect(should.map((s) => Object.keys(s.match)[0])).toEqual([
      "job_title",
      "headline",
      "skills",
      "summary",
    ]);
    expect(out.query.bool.minimum_should_match).toBe(1);
    expect(out.query.bool.must).toBeUndefined();
  });

  it("translates structured filters into must-clauses", () => {
    const out = buildPdlQuery({
      query: "",
      filters: {
        jobTitle: "Engineering Manager",
        company: "Stripe",
        seniority: "Director",
        location: "London",
        skills: ["Kubernetes", "  Go  "],
      },
    });
    const must = out.query.bool.must as Record<string, Record<string, unknown>>[];
    expect(must).toEqual([
      { match: { job_title: "Engineering Manager" } },
      { match: { job_company_name: "Stripe" } },
      { term: { job_title_levels: "director" } },
      { match: { location_name: "London" } },
      { term: { skills: "kubernetes" } },
      { term: { skills: "go" } },
    ]);
    expect(out.query.bool.should).toBeUndefined();
  });

  it("skips empty/whitespace-only skills", () => {
    const out = buildPdlQuery({ query: "x", filters: { skills: ["", "   "] } });
    const must = out.query.bool.must;
    expect(must).toBeUndefined();
  });
});