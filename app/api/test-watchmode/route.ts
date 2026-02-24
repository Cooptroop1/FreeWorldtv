import { NextResponse } from 'next/server';
import { WatchmodeClient } from '@watchmode/api-client';

const client = new WatchmodeClient({
  apiKey: 'b2HmkbZroSfdahf6vZ12p2xYSggJDjNTzWmNROKv',   // ← Make sure this is your real key!
});

export async function GET() {
  try {
    const result = await client.search.byName('The Office', { limit: 3 });

    return NextResponse.json({ 
      success: true, 
      message: 'Watchmode search works! 🎉',
      results: result.data 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}