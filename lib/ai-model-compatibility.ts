import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service';
import type { LanguageModelV1 } from 'ai';

// Define a consistent interface for all AI models
export type CompatibleLanguageModel = LanguageModelV1;

// Create a compatibility wrapper for Google models to match other providers
export function getCompatibleGoogleModel(modelName: string, apiKey?: string): CompatibleLanguageModel {
  const resolvedApiKey = apiKey || process.env.GOOGLE_API_KEY;

  if (!resolvedApiKey) {
    throw new Error('Google API key is required');
  }

  // In @ai-sdk/google v3.x, API key is set via environment variable
  // Set it temporarily for this model creation
  const originalApiKey = process.env.GOOGLE_API_KEY;
  if (apiKey && apiKey !== originalApiKey) {
    process.env.GOOGLE_API_KEY = apiKey;
  }

  const model = google(modelName) as unknown as CompatibleLanguageModel;

  // Restore original API key if we changed it
  if (originalApiKey && apiKey !== originalApiKey) {
    process.env.GOOGLE_API_KEY = originalApiKey;
  }

  return model;
}

export function getCompatibleOpenAIModel(modelName: string): CompatibleLanguageModel {
  return openai(modelName) as unknown as CompatibleLanguageModel;
}

export function getCompatibleAnthropicModel(modelName: string): CompatibleLanguageModel {
  return anthropic(modelName) as unknown as CompatibleLanguageModel;
}

// Consolidate AI model providers with compatibility
export function getModel(modelName: string, userPreferences?: UserAIPreferences): CompatibleLanguageModel {
  // Check if user has Gemini enabled and provided API key
  if (userPreferences?.geminiEnabled && (process.env.GOOGLE_API_KEY || userPreferences?.googleApiKey)) {
    if (modelName?.startsWith('gemini') || userPreferences?.preferGemini) {
      const apiKey = userPreferences?.googleApiKey || process.env.GOOGLE_API_KEY;
      if (apiKey) {
        return getCompatibleGoogleModel(modelName || 'gemini-3-pro', apiKey);
      }
    }
  }

  if (modelName.startsWith('gpt')) {
    return getCompatibleOpenAIModel(modelName);
  } else if (modelName.startsWith('claude')) {
    return getCompatibleAnthropicModel(modelName);
  }

  // Default fallback
  return getCompatibleOpenAIModel('gpt-4o-mini');
}