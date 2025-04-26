/**
 * API Key configuration
 * This file centralizes the OpenAI API key configuration for the application.
 * Replace the value below with your actual API key.
 */

// TODO: Replace this with your actual API key
export const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';

/**
 * Get the current OpenAI API key
 * Checks localStorage first, then falls back to the configured key
 */
export const getOpenAIApiKey = (): string => {
  const storedKey = localStorage.getItem('openai_api_key');
  return storedKey || OPENAI_API_KEY;
};

/**
 * Save the OpenAI API key to localStorage
 */
export const saveOpenAIApiKey = (key: string): void => {
  localStorage.setItem('openai_api_key', key);
}; 