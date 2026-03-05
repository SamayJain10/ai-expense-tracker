import Groq from "groq-sdk";

export interface ParsedExpense {
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchant: string | null;
}

export class ExpenseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseParseError";
  }
}

const VALID_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Health",
  "Travel",
  "Other",
] as const;

const SYSTEM_PROMPT = `
You are an expense parser. Extract expense information from natural language input.

RULES:
1. Extract the amount as a number.
2. Default currency is INR unless specified.
3. Categorize into exactly one of:
Food & Dining | Transport | Shopping | Entertainment | Bills & Utilities | Health | Travel | Other
4. Description should be a short clean summary.
5. Merchant is the store/company name if present, otherwise null.

Return ONLY valid JSON:
{
  "amount": number,
  "currency": string,
  "category": string,
  "description": string,
  "merchant": string | null
}

If amount cannot be extracted:
{ "error": "reason" }
`.trim();

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY environment variable is not set.");
  return new Groq({ apiKey });
}

function validate(raw: unknown): ParsedExpense {
  if (!raw || typeof raw !== "object") {
    throw new ExpenseParseError("AI returned an invalid response.");
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.error === "string") {
    throw new ExpenseParseError(obj.error);
  }

  if (typeof obj.amount !== "number" || isNaN(obj.amount) || obj.amount <= 0) {
    throw new ExpenseParseError("Could not extract a valid amount.");
  }

  const currency =
    typeof obj.currency === "string" && obj.currency.trim()
      ? obj.currency.trim().toUpperCase()
      : "INR";

  const rawCategory = typeof obj.category === "string" ? obj.category.trim() : "";
  const category = (VALID_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : "Other";

  if (typeof obj.description !== "string" || !obj.description.trim()) {
    throw new ExpenseParseError("AI did not return a description.");
  }

  const merchant =
    typeof obj.merchant === "string" && obj.merchant.trim()
      ? obj.merchant.trim()
      : null;

  return {
    amount: obj.amount,
    currency,
    category,
    description: obj.description.trim(),
    merchant,
  };
}

export async function parseExpense(text: string): Promise<ParsedExpense> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ExpenseParseError("Input is empty. Please describe your expense.");
  }

  const client = getClient();

  let rawText: string;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
    });

    rawText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`AI API request failed: ${msg}`);
  }

  let parsed: unknown;

  try {
    const clean = rawText.replace(/```(?:json)?|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`AI returned non-JSON output: ${rawText}`);
  }

  return validate(parsed);
}