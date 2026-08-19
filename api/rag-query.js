/* ============================================================
   VK AI Labs — RAG demo API route
   POST /api/rag-query   { question: string }
   -> { answer: string }

   Retrieval: BM25 over ai/knowledge-base chunks (same 209 chunks + same
   chunk.py/embed_bm25.py pipeline proven in the standalone RAG POC —
   see vkai-labs/insurance/ai/). Tokenizer + stopword list here are kept
   in lockstep with embed_bm25.py's tokenize() so retrieval behaves
   identically to the local proof.

   Generation: Claude synthesizes a short, cited answer from the
   retrieved chunks only — it's told explicitly not to use outside
   knowledge, so the demo stays honest about being grounded in this
   project's real docs rather than the model's general knowledge.

   No framework, no dependencies — plain Node (Vercel's default runtime
   for a .js file in /api), consistent with the rest of this repo.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const CHUNKS_PATH = path.join(__dirname, "data", "chunks.json");
const MODEL = "claude-sonnet-4-6";
const TOP_K = 6; // was 4 — raised after a real retrieval miss (a correct
// answer existed in the corpus but ranked outside the top 4 for that
// question's exact wording). More candidates = better recall at a small
// extra cost per question (~6 chunks of context instead of 4).

// Loaded once per cold start, reused across warm invocations.
let CHUNKS = null;
let TOKENIZED = null;
let AVG_DOC_LEN = 0;

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "of", "to",
  "in", "on", "at", "for", "with", "by", "from", "as", "is", "are", "was",
  "were", "be", "been", "being", "this", "that", "these", "those", "it",
  "its", "how", "does", "do", "did", "what", "which", "who", "whom",
  "when", "where", "why", "can", "could", "should", "would", "will",
  "shall", "may", "might", "must", "not", "no", "so", "than", "too",
  "very", "just", "about", "into", "over", "after", "before", "up",
  "down", "out", "off", "again", "further", "once", "here", "there",
  "all", "each", "few", "more", "most", "other", "some", "such", "own",
  "same", "work", "works", "working",
]);

const TOKEN_RE = /[a-z0-9][a-z0-9\-_./]*/g;

function tokenize(text) {
  const matches = text.toLowerCase().match(TOKEN_RE) || [];
  return matches.filter((t) => !STOPWORDS.has(t));
}

function loadIndex() {
  if (CHUNKS) return;
  const raw = fs.readFileSync(CHUNKS_PATH, "utf-8");
  CHUNKS = JSON.parse(raw);
  TOKENIZED = CHUNKS.map((c) => tokenize(c.text));
  AVG_DOC_LEN =
    TOKENIZED.reduce((sum, toks) => sum + toks.length, 0) / TOKENIZED.length;
}

// Standard Okapi BM25 (k1=1.5, b=0.75 — same defaults as rank_bm25's
// BM25Okapi, used in the local POC, for consistent ranking behaviour).
function bm25Scores(queryTokens) {
  const N = TOKENIZED.length;
  const k1 = 1.5;
  const b = 0.75;

  // document frequency per query term
  const df = {};
  queryTokens.forEach((t) => {
    df[t] = 0;
    TOKENIZED.forEach((toks) => {
      if (toks.includes(t)) df[t] += 1;
    });
  });

  const idf = {};
  Object.keys(df).forEach((t) => {
    const n = df[t];
    // small epsilon floor mirrors rank_bm25's handling of very common terms
    idf[t] = Math.max(
      0.01,
      Math.log((N - n + 0.5) / (n + 0.5) + 1)
    );
  });

  return TOKENIZED.map((toks) => {
    const docLen = toks.length;
    let score = 0;
    queryTokens.forEach((t) => {
      const f = toks.filter((x) => x === t).length;
      if (f === 0) return;
      const numerator = f * (k1 + 1);
      const denominator = f + k1 * (1 - b + (b * docLen) / AVG_DOC_LEN);
      score += idf[t] * (numerator / denominator);
    });
    return score;
  });
}

function retrieve(question, k) {
  const qTokens = tokenize(question);
  if (qTokens.length === 0) return [];
  const scores = bm25Scores(qTokens);
  return scores
    .map((score, i) => ({ chunk: CHUNKS[i], score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((r) => r.score > 0);
}

async function synthesize(question, results) {
  const context = results
    .map(
      (r, i) =>
        `[${i + 1}] Source: ${r.chunk.source} — ${r.chunk.heading}\n${r.chunk.text}`
    )
    .join("\n\n---\n\n");

  const system = [
    "You answer questions about the VK AI Labs Insurance engineering platform.",
    "Answer ONLY using the numbered context chunks provided below — do not use",
    "any outside knowledge, and do not speculate beyond what the context says.",
    "If the context doesn't contain the answer, say so plainly.",
    "Keep the answer to 2-4 sentences, conversational, no markdown headers.",
    "",
    "CONTEXT:",
    context,
  ].join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: system,
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Anthropic API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({
      error: "Demo isn't configured yet (missing ANTHROPIC_API_KEY).",
    });
    return;
  }

  let question;
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    question = (body && body.question ? String(body.question) : "").trim();
  } catch (e) {
    res.status(400).json({ error: "Invalid request body." });
    return;
  }

  if (!question || question.length > 300) {
    res.status(400).json({ error: "Please ask a question (max 300 characters)." });
    return;
  }

  try {
    loadIndex();
    const results = retrieve(question, TOP_K);

    if (results.length === 0) {
      res.status(200).json({
        answer:
          "I couldn't find anything in this project's docs relevant to that question — try asking about the architecture, orchestration, database design, or automation framework.",
      });
      return;
    }

    const answer = await synthesize(question, results);
    res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Something went wrong generating that answer. Please try again.",
    });
  }
};
