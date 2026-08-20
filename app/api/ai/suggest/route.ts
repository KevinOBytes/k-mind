import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';

export async function POST(req: Request) {
  try {
    const { label, type } = await req.json();

    if (!label || !type) {
      return NextResponse.json({ error: 'Missing label or type parameter' }, { status: 400 });
    }

    const cacheKey = `ai:suggest:${label.toLowerCase().trim()}:${type}`;
    const redis = await getRedisClient();

    // 1. Rate Limiting Check
    if (redis) {
      const ip = req.headers.get('x-forwarded-for') || 'local-ip';
      const rateLimitKey = `ratelimit:ai:${ip}`;
      const count = await redis.incr(rateLimitKey);
      
      if (count === 1) {
        await redis.expire(rateLimitKey, 60); // 1 minute window
      }

      if (count > 60) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again in a minute.' },
          { status: 429 }
        );
      }

      // 2. Cache Lookup
      const cached = await redis.get(cacheKey);
      if (cached) {
        const suggestions = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json({ suggestions, cached: true });
      }
    }

    // 3. LLM Generation
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      // Return mock response for developer testing if API key is missing
      const mockSuggestions = getMockSuggestions(label, type);
      return NextResponse.json({ suggestions: mockSuggestions, mock: true });
    }

    const systemInstruction = `You are a curriculum mapping expert. Given a concept label, suggest related topics to expand a learning pathway. Return ONLY a valid JSON array of objects, where each object has "label" (string) and "description" (short string, max 120 chars). Do not include markdown code block formatting (such as \`\`\`json) or any conversational text. Example: [{"label": "TS Fundamentals", "description": "Basic types, interfaces, and syntax."}]`;

    let userPrompt = '';
    if (type === 'child') {
      userPrompt = `Suggest 5 sub-topics or granular sub-skills directly nested under "${label}".`;
    } else if (type === 'parent') {
      userPrompt = `Suggest 3 prerequisite skills or foundational topics that should be learned before "${label}".`;
    } else {
      userPrompt = `Suggest 4 related technologies or brother/sister concepts that exist at the same level as "${label}".`;
    }

    const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'k-mind',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ]
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter API Error Status:', response.status);
      return NextResponse.json({ error: 'Failed to fetch suggestions from AI service' }, { status: 502 });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';
    
    // Clean code blocks if present
    const jsonString = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const suggestions = JSON.parse(jsonString);

    // 4. Store in Cache
    if (redis && Array.isArray(suggestions)) {
      await redis.set(cacheKey, JSON.stringify(suggestions), { ex: 604800 }); // 7 days TTL
    }

    return NextResponse.json({ suggestions, cached: false });
  } catch (error) {
    console.error('AI Suggestion route error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}

// Fallback mock responses for developer configurations
function getMockSuggestions(label: string, type: string) {
  if (type === 'child') {
    return [
      { label: `${label} Basics`, description: `Fundamental building blocks of ${label}.` },
      { label: `Advanced ${label}`, description: `Deep dive and performance optimizations.` },
      { label: `Common design patterns`, description: `Best practices for structuring ${label}.` }
    ];
  } else if (type === 'parent') {
    return [
      { label: `Fundamentals of Software Development`, description: `Pre-requisite coding skills.` },
      { label: `System Architecture`, description: `Basic architectural understanding.` }
    ];
  } else {
    return [
      { label: `Alternative tools`, description: `Concepts related to ${label}.` },
      { label: `Parallel ecosystems`, description: `Toolchains often paired with ${label}.` }
    ];
  }
}
