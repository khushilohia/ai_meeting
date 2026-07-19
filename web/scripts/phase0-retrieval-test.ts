// Phase 0 go/no-go test (PRD "Riskiest Assumption"): seed sample docs, fire planted
// questions, measure retrieval accuracy + end-to-end latency.
// Run: npm run phase0   (needs ANTHROPIC_API_KEY + VOYAGE_API_KEY in .env.local)

async function main() {
  const { db } = await import("../src/lib/db");
  const { ingest, search } = await import("../src/lib/retrieval");
  const { answer } = await import("../src/lib/claude");

  const docs: { title: string; content: string }[] = [
    {
      title: "Acme Corp — Pricing Sheet 2026",
      content: `Acme Pro plan costs $49 per user per month, billed annually. Monthly billing is $59 per user.

The Enterprise plan starts at $30,000 per year and includes SSO, audit logs, and a dedicated CSM.

Discounts: nonprofits get 30% off any plan. Annual prepay above 100 seats gets 15% off.

The free tier supports up to 3 users and 100 documents.`,
    },
    {
      title: "Acme Corp — Security & Compliance FAQ",
      content: `Acme is SOC 2 Type II certified as of March 2025. The audit is renewed annually.

All customer data is encrypted at rest with AES-256 and in transit with TLS 1.3.

Data residency: customers can choose US or EU hosting. EU data never leaves Frankfurt.

Acme supports SAML SSO on the Enterprise plan and SCIM provisioning for Okta and Azure AD.

Data retention after contract termination: all customer data is deleted within 30 days.`,
    },
    {
      title: "Meeting notes — Globex renewal call, May 2026",
      content: `Attendees: Sarah (Acme AE), Tom (Globex procurement).

Globex currently has 250 seats on the Pro plan. Tom raised concerns about the 12% price increase at renewal.

We agreed to hold pricing flat if Globex signs a 2-year term. Tom to confirm with legal by June 15.

Tom asked about the API rate limits — currently 1000 requests/minute on Pro; Enterprise gets custom limits.

Action: send Tom the security FAQ and the 2-year term sheet.`,
    },
  ];

  const questions: { q: string; expectSource: string; expectInAnswer: RegExp }[] = [
    { q: "How much does the Pro plan cost?", expectSource: "Pricing", expectInAnswer: /\$?49/ },
    { q: "What discount do nonprofits get?", expectSource: "Pricing", expectInAnswer: /30\s?%/ },
    { q: "How many users does the free tier support?", expectSource: "Pricing", expectInAnswer: /3/ },
    { q: "Are we SOC 2 certified?", expectSource: "Security", expectInAnswer: /SOC 2|Type II/i },
    { q: "Where is EU customer data hosted?", expectSource: "Security", expectInAnswer: /Frankfurt/i },
    { q: "How long is data retained after a contract ends?", expectSource: "Security", expectInAnswer: /30 days/i },
    { q: "How many seats does Globex have?", expectSource: "Globex", expectInAnswer: /250/ },
    { q: "What did we agree with Globex about renewal pricing?", expectSource: "Globex", expectInAnswer: /flat|2-year/i },
    { q: "What are the API rate limits on Pro?", expectSource: "Globex", expectInAnswer: /1000/ },
    { q: "When does Tom need to confirm with legal?", expectSource: "Globex", expectInAnswer: /June 15/i },
  ];

  // fresh seed under a dedicated test user
  const { hashPassword, newApiToken } = await import("../src/lib/auth");
  db.exec("DELETE FROM chunks; DELETE FROM documents; DELETE FROM users WHERE email = 'phase0@test.local';");
  const userId = Number(
    db
      .prepare("INSERT INTO users (email, name, password_hash, api_token) VALUES (?, ?, ?, ?)")
      .run("phase0@test.local", "Phase0", hashPassword("phase0-test-pw"), newApiToken()).lastInsertRowid
  );
  for (const d of docs) {
    const { lastInsertRowid } = db.prepare("INSERT INTO documents (title, user_id) VALUES (?, ?)").run(d.title, userId);
    await ingest(d.content, { documentId: Number(lastInsertRowid) });
  }
  console.log(`Seeded ${docs.length} docs.\n`);

  let retrievalHits = 0;
  let answerHits = 0;
  const latencies: number[] = [];

  for (const { q, expectSource, expectInAnswer } of questions) {
    const t0 = Date.now();
    const chunks = await search(q, userId);
    const retrieved = chunks[0]?.source.includes(expectSource) ?? false;
    const result = await answer(q, chunks);
    const ms = Date.now() - t0;
    latencies.push(ms);
    const answered = expectInAnswer.test(result.answer);
    if (retrieved) retrievalHits++;
    if (answered) answerHits++;
    console.log(
      `${retrieved ? "✓" : "✗"} retrieval  ${answered ? "✓" : "✗"} answer  ${String(ms).padStart(5)}ms  ${q}`
    );
    if (!answered) console.log(`    → got: ${result.answer}`);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length / 2)];
  console.log(`\nRetrieval: ${retrievalHits}/${questions.length}  Answers: ${answerHits}/${questions.length}  p50 latency: ${p50}ms  max: ${latencies[latencies.length - 1]}ms`);
  console.log(`GATE (PRD): need >=8/10 retrieval and p50 < 3000ms → ${retrievalHits >= 8 && p50 < 3000 ? "PASS ✅" : "FAIL ❌"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
