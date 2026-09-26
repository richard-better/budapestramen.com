import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preferredLanguage } from "./language";

describe("preferredLanguage", () => {
  it("picks whichever supported language the visitor lists first", () => {
    assert.equal(preferredLanguage("hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7"), "hu");
    assert.equal(preferredLanguage("en-GB,en;q=0.9,hu;q=0.8"), "en");
  });

  it("skips unsupported languages", () => {
    assert.equal(preferredLanguage("de-DE,de;q=0.9,hu;q=0.8,en;q=0.7"), "hu");
  });

  it("ranks by quality rather than position", () => {
    assert.equal(preferredLanguage("en;q=0.5, hu"), "hu");
  });

  it("ignores languages the visitor rejects", () => {
    assert.equal(preferredLanguage("hu;q=0, en;q=0.1"), "en");
  });

  it("falls back to English", () => {
    assert.equal(preferredLanguage(null), "en");
    assert.equal(preferredLanguage(""), "en");
    assert.equal(preferredLanguage("de, *;q=0.5"), "en");
  });
});
