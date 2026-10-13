import { config } from '../../../config/env.js';
import ApiError from '../../../utils/ApiError.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE = 'https://api.openai.com/v1';

export const openaiProvider = {
  name: 'openai',
  get model() {
    return config.ai.model || DEFAULT_MODEL;
  },
  async complete({ system, prompt, signal }) {
    const base = config.ai.baseUrl || DEFAULT_BASE;
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError(502, `OpenAI request failed (${response.status}).`, body.slice(0, 400));
    }

    const data = await response.json();
    return (data?.choices?.[0]?.message?.content || '').trim();
  },
};
