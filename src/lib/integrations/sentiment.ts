/**
 * Sentiment Analysis Provider Abstraction
 * Supports: OpenAI, xAI (Grok), Google Gemini, Vercel AI Gateway
 */

import type { AIProvider } from "@/lib/workflow/types";

export interface SentimentRequest {
  text: string;
  provider: AIProvider;
  model: string;
  apiKey: string;
  language?: string;
  includeEmotions?: boolean;
}

export interface SentimentScores {
  positive: number;
  negative: number;
  neutral: number;
}

export interface EmotionScores {
  joy: number;
  anger: number;
  sadness: number;
  fear: number;
  surprise: number;
  disgust: number;
}

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  scores: SentimentScores;
  emotions?: EmotionScores;
  language: string;
}

const SENTIMENT_SYSTEM_PROMPT = `You are a sentiment analysis assistant. Analyze the sentiment of the given text and respond with a JSON object containing:
- sentiment: "positive", "negative", "neutral", or "mixed"
- confidence: a number between 0 and 1
- scores: { positive: number, negative: number, neutral: number } (must sum to 1)
- emotions (if requested): { joy, anger, sadness, fear, surprise, disgust } (numbers 0-1)
- language: detected language code (e.g., "en", "es", "fr")

Respond ONLY with valid JSON, no additional text.`;

function buildUserPrompt(text: string, includeEmotions: boolean): string {
  const emotionInstruction = includeEmotions
    ? " Include the emotions breakdown."
    : " Do not include emotions.";
  return `Analyze the sentiment of this text:${emotionInstruction}\n\n"${text}"`;
}

function parseResponse(responseText: string): SentimentResult {
  // Try to extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and normalize the response
  const sentiment = parsed.sentiment?.toLowerCase();
  if (!["positive", "negative", "neutral", "mixed"].includes(sentiment)) {
    throw new Error(`Invalid sentiment value: ${sentiment}`);
  }

  return {
    sentiment: sentiment as SentimentResult["sentiment"],
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    scores: {
      positive: Math.max(0, Math.min(1, Number(parsed.scores?.positive) || 0)),
      negative: Math.max(0, Math.min(1, Number(parsed.scores?.negative) || 0)),
      neutral: Math.max(0, Math.min(1, Number(parsed.scores?.neutral) || 0)),
    },
    emotions: parsed.emotions
      ? {
          joy: Math.max(0, Math.min(1, Number(parsed.emotions.joy) || 0)),
          anger: Math.max(0, Math.min(1, Number(parsed.emotions.anger) || 0)),
          sadness: Math.max(
            0,
            Math.min(1, Number(parsed.emotions.sadness) || 0),
          ),
          fear: Math.max(0, Math.min(1, Number(parsed.emotions.fear) || 0)),
          surprise: Math.max(
            0,
            Math.min(1, Number(parsed.emotions.surprise) || 0),
          ),
          disgust: Math.max(
            0,
            Math.min(1, Number(parsed.emotions.disgust) || 0),
          ),
        }
      : undefined,
    language: parsed.language || "en",
  };
}

/**
 * OpenAI API implementation
 */
async function analyzeWithOpenAI(
  request: SentimentRequest,
): Promise<SentimentResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: "system", content: SENTIMENT_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(
            request.text,
            request.includeEmotions ?? false,
          ),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return parseResponse(content);
}

/**
 * xAI (Grok) API implementation
 * Uses OpenAI-compatible chat completions endpoint
 */
async function analyzeWithXAI(
  request: SentimentRequest,
): Promise<SentimentResult> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: "system", content: SENTIMENT_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(
            request.text,
            request.includeEmotions ?? false,
          ),
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in xAI response");
  }

  return parseResponse(content);
}

/**
 * Google Gemini API implementation
 */
async function analyzeWithGemini(
  request: SentimentRequest,
): Promise<SentimentResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${request.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SENTIMENT_SYSTEM_PROMPT}\n\n${buildUserPrompt(request.text, request.includeEmotions ?? false)}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return parseResponse(content);
}

/**
 * Vercel AI Gateway implementation
 */
async function analyzeWithVercelAI(
  request: SentimentRequest,
): Promise<SentimentResult> {
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
          { role: "system", content: SENTIMENT_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(
              request.text,
              request.includeEmotions ?? false,
            ),
          },
        ],
        temperature: 0.1,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel AI Gateway error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Vercel AI Gateway response");
  }

  return parseResponse(content);
}

/**
 * Main sentiment analysis function - routes to appropriate provider
 */
export async function analyzeSentiment(
  request: SentimentRequest,
): Promise<SentimentResult> {
  if (!request.text?.trim()) {
    throw new Error("Text is required for sentiment analysis");
  }

  if (!request.apiKey) {
    throw new Error("API key is required");
  }

  switch (request.provider) {
    case "openai":
      return analyzeWithOpenAI(request);
    case "xai":
      return analyzeWithXAI(request);
    case "gemini":
      return analyzeWithGemini(request);
    case "vercel-ai-gateway":
      return analyzeWithVercelAI(request);
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

/**
 * Provider model options for UI
 */
export const PROVIDER_MODELS: Record<
  AIProvider,
  { value: string; label: string }[]
> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  xai: [
    { value: "grok-4-0709", label: "Grok 4" },
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-3-mini", label: "Grok 3 Mini" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  "vercel-ai-gateway": [
    { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
    { value: "openai/gpt-4o", label: "OpenAI GPT-4o" },
    {
      value: "anthropic/claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
    },
    { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
};

export function getModelsForProvider(
  provider: AIProvider,
): { value: string; label: string }[] {
  return PROVIDER_MODELS[provider] || [];
}

export function getDefaultModel(provider: AIProvider): string {
  const models = PROVIDER_MODELS[provider];
  return models?.[0]?.value || "";
}
