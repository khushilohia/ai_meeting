// No-API-key sanity check: chunking + cosine. Run: npm run sanity
import assert from "assert";
import { chunkText } from "../src/lib/chunk";
import { cosine } from "../src/lib/embeddings";

// chunking
const small = chunkText("hello world");
assert.deepStrictEqual(small, ["hello world"]);

const paras = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} `.repeat(20).trim()).join("\n\n");
const chunks = chunkText(paras);
assert(chunks.length > 1, "long text should split");
assert(chunks.every((c) => c.length <= 1200), "chunks respect max size");
assert.strictEqual(chunks.join("\n\n").replace(/\s+/g, " "), paras.replace(/\s+/g, " "), "no content lost");

const oversized = chunkText("x".repeat(3000));
assert(oversized.length === 3 && oversized.join("") === "x".repeat(3000), "hard-split oversized paragraph");

// cosine
assert(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9);
assert(Math.abs(cosine([1, 0], [0, 1])) < 1e-9);
assert(cosine([1, 2, 3], [1, 2, 3]) > cosine([1, 2, 3], [3, 2, 1]));

console.log("sanity: all checks passed");
