import { config } from '../../../config/env.js';
import ApiError from '../../../utils/ApiError.js';

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const geminiProvider = {
  name: 'gemini',
  get model() {
    return config.ai.model || DEFAULT_MODEL;
  },
  async complete({ system, prompt, signal }) {
    const base = config.ai.baseUrl || DEFAULT_BASE;
    const url = `${base}/models/${this.model}:generateContent?key=${config.ai.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError(502, `Gemini request failed (${response.status}).`, body.slice(0, 400));
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((part) => part.text || '').join('').trim();
  },
};
