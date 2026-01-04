// DO NOT USE THIS IN A USER FACING FEATURE
type SnowflakeRequest = {
  prompt: string;
  image_base64?: string;
  image_mime_type?: string;
  model?: string;
  response_format?: {
    type: string;
    schema?: any;
  };
};

export async function callSnowflakeLLM({
  prompt,
  image_base64,
  image_mime_type,
  model: providedModel,
  response_format
}: SnowflakeRequest) {
  const SNOWFLAKE_ENDPOINT = process.env.SNOWFLAKE_LLM_ENDPOINT!;
  const SNOWFLAKE_TOKEN = process.env.SNOWFLAKE_API_TOKEN!;

  const model = providedModel || 'openai-gpt-5-mini';

  const contentList: any[] = [
    {
      type: 'text',
      text: prompt
    }
  ];

  if (image_base64 && image_mime_type) {
    contentList.push({
      type: 'image',
      details: {
        type: 'base64',
        content: image_base64,
        content_type: image_mime_type
      }
    });
  }

  const body: any = {
    model,
    messages: [
      {
        role: 'user',
        content_list: contentList
      }
    ]
  };

  if (response_format) {
    body.response_format = response_format;
  }

  const res = await fetch(`${SNOWFLAKE_ENDPOINT}/api/v2/cortex/inference:complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SNOWFLAKE_TOKEN}`,
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Snowflake LLM error ${res.status}: ${errText}`);
  }

  // Parse SSE stream response
  const text = await res.text();
  const lines = text.split('\n').filter(line => line.startsWith('data: '));
  
  if (lines.length === 0) {
    throw new Error('No data in SSE response');
  }

  // Accumulate all text chunks from the stream
  let fullText = '';
  let lastMessage = null;
  
  for (const line of lines) {
    const jsonStr = line.substring(6); // Remove "data: " prefix
    const message = JSON.parse(jsonStr);
    lastMessage = message;
    
    // Extract text from delta
    if (message.choices?.[0]?.delta?.text) {
      fullText += message.choices[0].delta.text;
    }
  }
  
  // Return the last message with accumulated text
  if (lastMessage && lastMessage.choices?.[0]) {
    lastMessage.choices[0].message = {
      role: 'assistant',
      content: fullText
    };
  }
  
  return lastMessage;
}
