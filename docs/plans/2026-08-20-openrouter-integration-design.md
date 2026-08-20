# Design - OpenRouter AI API Integration

We are migrating our AI suggestions backend from the direct Gemini API to the OpenRouter API.

## Environment Variables Configuration

- `OPENROUTER_API_KEY`: API credential key.
- `OPENROUTER_MODEL`: LLM model ID (defaulting to `google/gemini-2.5-flash`).

## Request/Response Architecture

- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Request Format**: Standard OpenAI completion API body:
  ```json
  {
    "model": "google/gemini-2.5-flash",
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ]
  }
  ```
- **Response Format**: Parse content from `data.choices[0].message.content`.

## Affected Files

- [`app/api/ai/suggest/route.ts`](file:///Users/kevo/Projects/k-mind/app/api/ai/suggest/route.ts): Update API client call structure.
- [`.env.example`](file:///Users/kevo/Projects/k-mind/.env.example): Swap env keys.
- [`tests/ai.test.ts`](file:///Users/kevo/Projects/k-mind/tests/ai.test.ts): Update test mocks.
