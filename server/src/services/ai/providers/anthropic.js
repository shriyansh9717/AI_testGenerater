import { config } from '../../../config/env.js';
import ApiError from '../../../utils/ApiError.js';

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const DEFAULT_BASE = 'https://api.anthropic.com/v1';

export const anthropicProvider = {
  name: 'anthropic',
  get model() {
    return config.ai.model || DEFAULT_MODEL;
  },
  async complete({ system, prompt, signal }) {
    const base = config.ai.baseUrl || DEFAULT_BASE;
    const response = await fetch(`${base}/messages`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ai.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError(502, `Anthropic request failed (${response.status}).`, body.slice(0, 400));
    }

    const data = await response.json();
    return (data?.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
  },
};
