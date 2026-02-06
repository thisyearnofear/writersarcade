'use client'

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UserAIPreferences {
  geminiEnabled: boolean;
  googleApiKey?: string;
  preferGemini: boolean;
}

export function AISettingsPanel({ initialPreferences }: { initialPreferences?: UserAIPreferences }) {
  const [preferences, setPreferences] = useState<UserAIPreferences>(() => {
    // Initialize from props or localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiPreferences');
      if (saved) {
        return JSON.parse(saved);
      }
    }

    // Fallback to initialPreferences if provided
    if (initialPreferences) {
      return initialPreferences;
    }

    return { geminiEnabled: false, preferGemini: false };
  });

  const [apiKey, setApiKey] = useState(preferences.googleApiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Update state when initialPreferences change
  useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
      setApiKey(initialPreferences.googleApiKey || '');
    }
  }, [initialPreferences]);

  const savePreferences = (updatedPrefs: UserAIPreferences) => {
    setPreferences(updatedPrefs);

    // Save to localStorage for client components
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiPreferences', JSON.stringify(updatedPrefs));
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleGemini = (enabled: boolean) => {
    const newPrefs = { ...preferences, geminiEnabled: enabled };
    if (!enabled) {
      newPrefs.googleApiKey = undefined;
      setApiKey('');
    }
    savePreferences(newPrefs);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    savePreferences({ ...preferences, googleApiKey: value });
  };

  const handlePreferGeminiChange = (checked: boolean) => {
    const newPrefs = { ...preferences, preferGemini: checked };
    savePreferences(newPrefs);
  };

  const validateAndSaveApiKey = async () => {
    if (!apiKey) return;

    setIsValidating(true);
    setValidationError('');

    try {
      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleApiKey: apiKey }),
      });

      const result = await response.json();

      if (result.valid) {
        const newPrefs = { ...preferences, googleApiKey: apiKey, preferGemini: true };
        savePreferences(newPrefs);
      } else {
        setValidationError(result.error || 'Invalid API key');
      }
    } catch (error) {
      setValidationError('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const clearApiKey = () => {
    const newPrefs = { ...preferences, googleApiKey: undefined, geminiEnabled: false, preferGemini: false };
    setPreferences(newPrefs);
    setApiKey('');
    savePreferences(newPrefs);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-900/50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">AI Provider Settings</h3>
          <p className="text-xs text-gray-400">Configure your preferred AI models</p>
        </div>
        {isSaved && (
          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
            Saved!
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          <label className="text-sm font-medium text-white">Enable Gemini 3</label>
          <p className="text-xs text-gray-400">Use your own Google AI API key</p>
        </div>
        <Switch
          checked={preferences.geminiEnabled}
          onCheckedChange={handleToggleGemini}
        />
      </div>

      {preferences.geminiEnabled && (
        <div className="space-y-3 mt-3 pl-2 border-l-2 border-purple-500">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter your Google AI API key"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="font-mono text-xs bg-gray-800 border-gray-700 text-white"
            />
            <div className="flex gap-2">
              <Button
                onClick={validateAndSaveApiKey}
                disabled={!apiKey || isValidating}
                size="sm"
                variant="secondary"
                className="text-xs"
              >
                {isValidating ? 'Validating...' : 'Validate & Save'}
              </Button>
              <Button
                onClick={clearApiKey}
                variant="outline"
                size="sm"
                className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Clear
              </Button>
            </div>
            {validationError && (
              <p className="text-xs text-red-400">{validationError}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm pt-2">
            <div>
              <span className="text-white">Prioritize Gemini 3</span>
              <p className="text-xs text-gray-400">When enabled, prefer Gemini for AI tasks</p>
            </div>
            <Switch
              checked={preferences.preferGemini}
              onCheckedChange={handlePreferGeminiChange}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 pt-2">
        <p>• Your API key is stored locally and never sent to our servers</p>
        <p>• Bring your own Google AI API key to use Gemini 3 models</p>
      </div>
    </div>
  );
}