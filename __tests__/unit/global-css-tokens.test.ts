import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const cssContent = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf-8"
);

/**
 * Extract the content of a CSS block by its selector.
 * Returns the text between the opening `{` and closing `}`.
 */
function extractBlock(css: string, selector: string): string {
  // Match the selector followed by its block
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, "s");
  const match = css.match(regex);
  return match ? match[1] : "";
}

const kioskTokens = [
  "--kiosk-primary",
  "--kiosk-success",
  "--kiosk-warning",
  "--kiosk-info",
] as const;

describe("Global CSS kiosk tokens", () => {
  it("defines kiosk color tokens in :root", () => {
    const rootBlock = extractBlock(cssContent, ":root");
    expect(rootBlock.length).toBeGreaterThan(0);

    for (const token of kioskTokens) {
      expect(rootBlock).toContain(token);
    }
  });

  it("defines kiosk color tokens in .dark", () => {
    const darkBlock = extractBlock(cssContent, ".dark");
    expect(darkBlock.length).toBeGreaterThan(0);

    for (const token of kioskTokens) {
      expect(darkBlock).toContain(token);
    }
  });

  it("registers kiosk color tokens in @theme inline block", () => {
    // The @theme inline block uses --color-kiosk-* tokens
    expect(cssContent).toContain("--color-kiosk-primary");
    expect(cssContent).toContain("--color-kiosk-success");
    expect(cssContent).toContain("--color-kiosk-warning");
    expect(cssContent).toContain("--color-kiosk-info");
  });

  it("defines kiosk spacing tokens in :root", () => {
    const rootBlock = extractBlock(cssContent, ":root");

    expect(rootBlock).toContain("--kiosk-card-padding");
    expect(rootBlock).toContain("--kiosk-card-radius");
    expect(rootBlock).toContain("--kiosk-touch-min");
    expect(rootBlock).toContain("--kiosk-body-min");
  });
});
