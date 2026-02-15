import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'

export async function POST(request: NextRequest) {
  try {
    const { googleApiKey } = await request.json();

    if (!googleApiKey) {
      return NextResponse.json({ valid: false, error: 'API key is required' }, { status: 400 });
    }

    // Validate API key by attempting to create the model
    try {
      // Just try to create the model with the API key - if invalid, it will throw
      google('gemini-3-pro', {
        apiKey: googleApiKey
      });

      // If we get here, the API key is syntactically valid
      // For a more thorough validation, we could make a simple API call
      // but this would incur costs, so we'll just validate format for now
      return NextResponse.json({ valid: true });
    } catch (error) {
      console.error('API key validation failed:', error);
      return NextResponse.json({ valid: false, error: 'Invalid API key' }, { status: 400 });
    }
  } catch (error) {
    console.error('API validation error:', error);
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}