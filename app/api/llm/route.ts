import { NextRequest, NextResponse } from 'next/server';
import { callSnowflakeLLM } from '@/lib/snowflakeLLM';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Require authentication to prevent abuse
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt, image_base64, image_mime_type, model, response_format } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  try {
    const llmOutput = await callSnowflakeLLM({
      prompt,
      image_base64,
      image_mime_type,
      model,
      response_format
    });

    return NextResponse.json({ output: llmOutput });
  } catch (error) {
    console.error('LLM call failed', error);
    return NextResponse.json({ error: 'Snowflake LLM call failed' }, { status: 500 });
  }
}
