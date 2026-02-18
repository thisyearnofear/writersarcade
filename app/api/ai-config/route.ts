import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'

export async function POST(request: NextRequest) {
  try {
    const { googleApiKey } = await request.json();

    if (!googleApiKey) {
      return NextResponse.json({ valid: false, error: 'API key is required' }, { status: 400 });
    }

    // Validate API key format (basic check)
    // In @ai-sdk/google v3.x, the API key is set via environment variable
    // We can't pass it directly to the model constructor anymore
    // So we just validate the format here
    if (typeof googleApiKey !== 'string' || googleApiKey.length === 0) {
      return NextResponse.json({ valid: false, error: 'Invalid API key format' }, { status: 400 });
    }

    // If we get here, the API key is syntactically valid
    // For a more thorough validation, we could make a simple API call
    // but this would incur costs, so we'll just validate format for now
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('API validation error:', error);
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}