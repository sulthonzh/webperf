import { validateUrl } from "./utils";

describe("validateUrl", () => {
  it("accepts https URLs", () => {
    expect(validateUrl("https://example.com")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(validateUrl("http://localhost:3000")).toBe(true);
  });

  it("rejects URLs without protocol", () => {
    expect(validateUrl("example.com")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(validateUrl("")).toBe(false);
  });

  it("rejects random strings", () => {
    expect(validateUrl("not a url")).toBe(false);
  });

  it("accepts URLs with paths", () => {
    expect(validateUrl("https://example.com/path/to/page")).toBe(true);
  });

  it("accepts URLs with query params", () => {
    expect(validateUrl("https://example.com?q=test")).toBe(true);
  });
});
