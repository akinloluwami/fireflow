/**
 * Text Summarization Provider Abstraction
 * Supports: OpenAI, xAI (Grok), Google Gemini, Vercel AI Gateway
 */

import type { AIProvider } from "@/lib/workflow/types";

export interface SummarizationRequest {
  text: string;
  provider: AIProvider;
  model: string;
  apiKey: string;
  maxLength?: number;
  style?: "concise" | "detailed" | "bullet-points";
  language?: string;
}

export interface SummarizationResult {
  summary: string;
  wordCount: number;
  originalWordCount: number;
  language: string;
}

const SUMMARIZATION_SYSTEM_PROMPT = `You are a text summarization assistant. Summarize the given text and respond with a JSON object containing:
- summary: the summarized text as a single string (if bullet points are requested, use "- " prefixed lines joined with newlines inside the string)
- wordCount: number of words in the summary
- originalWordCount: number of words in the original text
- language: detected language code (e.g., "en", "es", "fr")

IMPORTANT: The "summary" field must ALWAYS be a single string, never an array. For bullet points, use newline characters within the string like: "- Point one\\n- Point two\\n- Point three"

Respond ONLY with valid JSON, no additional text.`;

function buildUserPrompt(
  text: string,
  style: string,
  maxLength?: number,
): string {
  let instruction = `Summarize the following text`;
  if (style === "bullet-points") {
    instruction += " using bullet points";
  } else if (style === "detailed") {
    instruction += " in detail, preserving key information";
  } else {
    instruction += " concisely";
  }
  if (maxLength) {
    instruction += ` in approximately ${maxLength} words or fewer`;
  }
  return `${instruction}:\n\n"${text}"`;
}

function parseResponse(responseText: string): SummarizationResult {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Handle summary as array (some models return bullet points as arrays)
  let summary: string;
  if (typeof parsed.summary === "string") {
    summary = parsed.summary;
  } else if (Array.isArray(parsed.summary)) {
    summary = parsed.summary.map((item: unknown) => String(item)).join("\n");
  } else if (parsed.summary != null) {
    summary = String(parsed.summary);
  } else {
    throw new Error("No summary in response");
  }

  return {
    summary,
    wordCount: Number(parsed.wordCount) || summary.split(/\s+/).length,
    originalWordCount: Number(parsed.originalWordCount) || 0,
    language: parsed.language || "en",
  };
}


/**
 * OpenAI API implementation
 */
async function summarizeWithOpenAI(
  request: SummarizationRequest,
): Promise<SummarizationResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: "system", content: SUMMARIZATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(
            request.text,
            request.style ?? "concise",
            request.maxLength,
          ),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenAI response");
  return parseResponse(content);
}

/**
 * xAI (Grok) API implementation
 */
async function summarizeWithXAI(
  request: SummarizationRequest,
): Promise<SummarizationResult> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: "system", content: SUMMARIZATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(
            request.text,
            request.style ?? "concise",
            request.maxLength,
          ),
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in xAI response");
  return parseResponse(content);
}

/**
 * Google Gemini API implementation
 */
async function summarizeWithGemini(
  request: SummarizationRequest,
): Promise<SummarizationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${request.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SUMMARIZATION_SYSTEM_PROMPT}\n\n${buildUserPrompt(request.text, request.style ?? "concise", request.maxLength)}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No content in Gemini response");
  return parseResponse(content);
}

/**
 * Vercel AI Gateway implementation
 */
async function summarizeWithVercelAI(
  request: SummarizationRequest,
): Promise<SummarizationResult> {
  const response = await fetch(
    "https://ai-gateway.vercel.sh/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: "system", content: SUMMARIZATION_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(
              request.text,
              request.style ?? "concise",
              request.maxLength,
            ),
          },
        ],
        temperature: 0.3,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel AI Gateway error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in Vercel AI Gateway response");
  return parseResponse(content);
}

/**
 * Main summarization function - routes to appropriate provider
 */
export async function summarizeText(
  request: SummarizationRequest,
): Promise<SummarizationResult> {
  if (!request.text?.trim()) {
    throw new Error("Text is required for summarization");
  }
  if (!request.apiKey) {
    throw new Error("API key is required");
  }

  switch (request.provider) {
    case "openai":
      return summarizeWithOpenAI(request);
    case "xai":
      return summarizeWithXAI(request);
    case "gemini":
      return summarizeWithGemini(request);
    case "vercel-ai-gateway":
      return summarizeWithVercelAI(request);
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}
