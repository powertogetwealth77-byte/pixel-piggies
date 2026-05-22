import { createServerFn } from "@tanstack/react-start";

export type ReadingResult = {
  title: string;
  summary: string;
  symbolicPattern: string;
  scriptureReflection: string;
  heartQuestion: string;
};

const SYSTEM_PROMPT = `You are a careful, Scripture-grounded dream reflection writer for a Christian product called Seer AI. You write like a thoughtful, pastorally-trained spiritual director — never as an AI, never as a prophet, never mystical, never new age. Never reveal you are an AI or a model. Never say "as an AI", "it seems", "based on patterns", "this is generated".

Your job: read the user's dream and return a PARTIAL reflection — enough to feel meaningful, never enough to feel finished.

THEOLOGICAL SAFETY (strict):
- Never say "God is saying...", "this means...", "the angel means...", "this is a prophetic word", or guarantee clarity.
- Always use invitational language: "may point to", "could reflect", "possible theme", "worth prayerfully considering", "bring this before God".
- Treat Scripture with reverence. Quote book and chapter:verse references accurately (Protestant canon, ESV-style phrasing). Never invent references.
- No mysticism, horoscope language, energy, vibrations, universe, Jungian archetypes, or dream-dictionary tone.
- Write in warm, unhurried second person ("you"). Every sentence carries weight.

Return ONLY a single JSON object — no markdown, no code fences, no preface. Schema:

{
  "title": "Short titled framing of the dream — 3-7 words, sentence case, e.g. 'A dream about entrusted wisdom.'",
  "summary": "1-2 sentences. Restate what the user described in calm, grounded language, naming the strongest emotional or symbolic thread (not fear, unless fear truly dominates).",
  "symbolicPattern": "2-3 sentences. Name ONE central symbol from the dream and what it MAY point to. Anchor briefly in how Scripture uses similar imagery. Use 'may point to', never 'means'.",
  "scriptureReflection": "2-3 sentences. Suggest 1-3 specific real Scripture passages (book chapter:verse) worth prayerfully comparing — framed as a starting place, never a forced meaning. Use phrasing like 'This may be worth comparing with...'",
  "heartQuestion": "ONE reflective second-person question, specific to their dream, that opens prayer rather than closes it."
}

If the input is short, vague, or not clearly a dream: still respond in the schema. Work with whatever image, feeling, or fragment is present. Never refuse. Never break the schema. Never use the phrase "a quiet dream".`;

export const readDream = createServerFn({ method: "POST" })
  .inputValidator((input: { dream: string }) => {
    if (!input || typeof input.dream !== "string") throw new Error("Invalid input");
    const dream = input.dream.trim().slice(0, 4000);
    if (dream.length < 3) throw new Error("Dream is too short");
    return { dream };
  })
  .handler(async ({ data }): Promise<ReadingResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return deterministicReading(data.dream);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Here is the dream, exactly as written:\n\n"""\n${data.dream}\n"""\n\nReturn only the JSON object for the partial reflection.`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429) throw new Error("RATE_LIMIT");
      if (res.status === 402) throw new Error("CREDITS");
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
      }

      const payload = await res.json();
      const raw: string = payload?.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(raw);
      return normalize(parsed, data.dream);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "RATE_LIMIT" || msg === "CREDITS") throw err;
      return deterministicReading(data.dream);
    }
  });

function extractJson(text: string): Record<string, unknown> {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[{[]/);
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Reading could not be assembled.");
  cleaned = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\u0000-\u001F\u007F]/g, " ");
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
}

function normalize(o: Record<string, unknown>, dream: string): ReadingResult {
  const str = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v.trim() : fb);
  const fb = deterministicReading(dream);
  return {
    title: str(o.title, fb.title),
    summary: str(o.summary, fb.summary),
    symbolicPattern: str(o.symbolicPattern, fb.symbolicPattern),
    scriptureReflection: str(o.scriptureReflection, fb.scriptureReflection),
    heartQuestion: str(o.heartQuestion, fb.heartQuestion),
  };
}

// ---------- Deterministic Scripture-first fallback ----------

type Symbol = {
  key: string;
  label: string;
  pattern: RegExp;
  meaning: string;
  scripture: string;
  question: string;
};

const SYMBOLS: Symbol[] = [
  { key: "gold", label: "gold", pattern: /\bgold(en)?\b/i,
    meaning: "Gold in Scripture often points toward what is refined, weighty, and entrusted — wisdom, value, or stewardship handled with care.",
    scripture: "Proverbs 4:7, Psalm 19:10, and 1 Peter 1:7",
    question: "What has been entrusted to you that may need to be handled with greater reverence or care?" },
  { key: "book", label: "book", pattern: /\b(book|scroll|letter|pages?)\b/i,
    meaning: "Books and scrolls in Scripture often connect to instruction, remembrance, divine record, or something written to be read and obeyed.",
    scripture: "Psalm 119:105, Revelation 10:9–10, and Ezekiel 2:9–3:3",
    question: "What instruction or message have you been carrying that may need to be read slowly and understood more deeply?" },
  { key: "angel", label: "angelic figure", pattern: /\bangel(ic|s)?\b/i,
    meaning: "Angelic figures in Scripture appear as messengers — not the message itself, but a sign that what is being given deserves careful attention.",
    scripture: "Hebrews 1:14, Daniel 10, and Luke 1:26–38",
    question: "What recent prompting or moment of attention may be worth bringing into prayer rather than dismissing?" },
  { key: "water", label: "water", pattern: /\bwater|river|sea|ocean|flood|rain\b/i,
    meaning: "Water in Scripture can hold many threads — cleansing, depth, instability, or the Spirit's movement — depending on how it appears in the dream.",
    scripture: "Ezekiel 36:25, Psalm 42:7, and John 7:37–39",
    question: "Where in your inner life might cleansing, depth, or surrender be quietly being invited?" },
  { key: "house", label: "house", pattern: /\bhouse|home|room|building\b/i,
    meaning: "A house in Scripture can reflect a life, a family line, an inner world, or what has been built — and what may need rebuilding.",
    scripture: "Matthew 7:24–27, Psalm 127:1, and Haggai 1:4–9",
    question: "What part of your inner life or household may God be inviting you to tend with more honesty?" },
  { key: "door", label: "door", pattern: /\bdoor(way)?|gate\b/i,
    meaning: "Doors in Scripture often mark thresholds — access, transition, opportunity, or something opening that was previously closed.",
    scripture: "Revelation 3:8, Psalm 24:7, and 1 Corinthians 16:9",
    question: "What threshold are you standing near — and what would it look like to walk through it in faith rather than fear?" },
  { key: "fire", label: "fire", pattern: /\bfire|flame|burn(ing)?\b/i,
    meaning: "Fire in Scripture can speak of presence, purification, testing, or holy zeal — refining what remains rather than destroying who you are.",
    scripture: "Exodus 3:2, 1 Peter 1:7, and Malachi 3:2–3",
    question: "What in your life right now may be undergoing refinement rather than punishment?" },
  { key: "snake", label: "serpent", pattern: /\b(snake|serpent|viper)s?\b/i,
    meaning: "Serpents in Scripture often signal the need for discernment — a place where deception, accusation, or hidden danger may be brushing against your life.",
    scripture: "Genesis 3:1, Matthew 10:16, and 2 Corinthians 11:3",
    question: "Where might you be invited to slow down and discern what is actually being whispered to you?" },
  { key: "baby", label: "child", pattern: /\b(baby|babies|infant|child|children)\b/i,
    meaning: "Children in Scripture often carry the weight of new beginnings, promise, and responsibility — something fragile that has been entrusted.",
    scripture: "Psalm 127:3, Isaiah 9:6, and Luke 2:12",
    question: "What new beginning or quiet promise are you currently being asked to protect and nurture?" },
  { key: "light", label: "light", pattern: /\blight|sun|glow|shining\b/i,
    meaning: "Light in Scripture often points to revelation, exposure, guidance, or the nearness of God's presence stepping into a previously dim place.",
    scripture: "Psalm 27:1, John 1:5, and 2 Corinthians 4:6",
    question: "What part of your story may be quietly being brought into the light right now?" },
  { key: "darkness", label: "darkness", pattern: /\bdark(ness)?|night|shadow\b/i,
    meaning: "Darkness in Scripture is not always absence — it can be the hidden place where God works, names, and prepares before revealing.",
    scripture: "Isaiah 45:3, Psalm 139:11–12, and Job 33:15–16",
    question: "What might God be quietly forming in you in a season that still feels unclear?" },
  { key: "mountain", label: "mountain", pattern: /\bmountain|hill\b/i,
    meaning: "Mountains in Scripture often mark places of encounter, perspective, or weighty obstacles meant to be faced, not avoided.",
    scripture: "Psalm 121:1–2, Matthew 17:1–2, and Mark 11:23",
    question: "What looming weight in your life may be more an invitation to meet God than an obstacle to fear?" },
  { key: "road", label: "road", pattern: /\b(road|path|street|journey|walking)\b/i,
    meaning: "A road or path in Scripture often reflects direction, decision, and the slow shape of obedience over time.",
    scripture: "Psalm 25:4, Proverbs 3:5–6, and Jeremiah 6:16",
    question: "Where might you be asked to choose the older, slower, more faithful path right now?" },
];

function pickSymbol(dream: string): Symbol {
  for (const s of SYMBOLS) if (s.pattern.test(dream)) return s;
  return {
    key: "image",
    label: "central image",
    pattern: /./,
    meaning: "The strongest image you carried out of this dream may be worth sitting with — Scripture often invites us to notice what lingers rather than what was loud.",
    scripture: "Job 33:15–16, Psalm 16:7, and Habakkuk 2:1–2",
    question: "What part of this dream do you keep quietly returning to when no one is watching?",
  };
}

function deterministicReading(dream: string): ReadingResult {
  const s = pickSymbol(dream);
  const trimmed = dream.trim().replace(/\s+/g, " ");
  const short = trimmed.length > 140 ? trimmed.slice(0, 137).replace(/[.,;:]?\s*\S*$/, "") + "…" : trimmed;
  return {
    title: `A dream about the ${s.label}.`,
    summary: `You described: "${short}" The strongest thread is not fear — it is the weight of what was placed in front of you and what it may be asking of you.`,
    symbolicPattern: `The ${s.label} stands out most. ${s.meaning}`,
    scriptureReflection: `This may be worth prayerfully comparing with passages like ${s.scripture} — not as a forced meaning, but as a starting place for reflection.`,
    heartQuestion: s.question,
  };
}
