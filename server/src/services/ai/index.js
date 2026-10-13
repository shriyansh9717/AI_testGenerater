import { config } from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';
import { geminiProvider } from './providers/gemini.js';
import { openaiProvider } from './providers/openai.js';
import { anthropicProvider } from './providers/anthropic.js';

const registry = {
  gemini: geminiProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

export function listProviders() {
  return Object.keys(registry);
}

export function isAiConfigured() {
  return Boolean(config.ai.apiKey && registry[config.ai.provider]);
}

export function getProvider() {
  const provider = registry[config.ai.provider];
  if (!provider) {
    throw ApiError.serviceUnavailable(
      `Unknown AI provider "${config.ai.provider}". Set AI_PROVIDER to one of: ${listProviders().join(', ')}.`
    );
  }
  if (!config.ai.apiKey) {
    throw ApiError.serviceUnavailable(
      'No AI API key is configured. Set AI_API_KEY in the server environment to generate questions.'
    );
  }
  return provider;
}

/** Single entry point for every model call, with a hard timeout. */
export async function complete({ system, prompt }) {
  const provider = getProvider();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
  try {
    return await provider.complete({ system, prompt, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw ApiError.serviceUnavailable('The AI provider did not respond in time. Try fewer questions.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
