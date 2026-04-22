import test from "node:test";
import assert from "node:assert/strict";

import { buildPageScanResult, htmlToText, normalizePageText } from "../src/connectors/chrome-extension/page-scan.js";

test("normalizePageText trims and collapses noisy whitespace", () => {
  const result = normalizePageText("  Hello   world \n\n\n This   is   a   test \n ");
  assert.equal(result, "Hello world\n\nThis is a test");
});

test("buildPageScanResult preserves url/title and normalizes text", () => {
  const result = buildPageScanResult({
    url: "https://example.com",
    title: "Example Domain",
    text: " Example   Domain \n\n More    text ",
  });

  assert.deepEqual(result, {
    url: "https://example.com",
    title: "Example Domain",
    text: "Example Domain\n\nMore text",
  });
});

test("htmlToText strips tags and keeps readable text", () => {
  const html = "<html><body><h1>Example</h1><p>Hello <strong>world</strong></p></body></html>";
  assert.equal(htmlToText(html), "\n\nExample\n\nHello \nworld\n\n");
});
