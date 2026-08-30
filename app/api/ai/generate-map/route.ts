import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Missing or empty text parameter' }, { status: 400 });
    }

    const redis = await getRedisClient();

    // 1. Rate Limiting
    if (redis) {
      const ip = req.headers.get('x-forwarded-for') || 'local-ip';
      const rateLimitKey = `ratelimit:ai:generate-map:${ip}`;
      const count = await redis.incr(rateLimitKey);
      
      if (count === 1) {
        await redis.expire(rateLimitKey, 60); // 1 minute window
      }

      if (count > 10) { // Max 10 custom generations per minute
        return NextResponse.json(
          { error: 'Too many requests. Please try again in a minute.' },
          { status: 429 }
        );
      }
    }

    // 2. OpenRouter check
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      const mockResult = getMockMapData(text);
      return NextResponse.json({ ...mockResult, mock: true });
    }

    // 3. Prompting AI to structure relations
    const systemInstruction = `You are an AI expert in curriculum mapping and graph databases.
Given a list of skills or topics, you must organize them into a learning pathway represented as a Directed Acyclic Graph (DAG) with prerequisites.
You must output ONLY a valid JSON object matching the following structure:
{
  "title": "Title for this roadmap (string)",
  "nodes": [
    { "id": "unique-id (string)", "label": "Skill Name (string)", "description": "Short explanation (string, max 120 chars)" }
  ],
  "edges": [
    { "source": "prerequisite-node-id (string)", "target": "dependent-node-id (string)" }
  ]
}
Ensure there are no cyclic loops. Use clean, short IDs like "n1", "n2", "n3", etc.
Do not include markdown code block formatting (such as \`\`\`json) or any conversational text. Return only the raw JSON.`;

    const userPrompt = `Generate a structured relationship graph mapping out these skills:
${text}

Organize them logically, making foundational topics prerequisites (source) for advanced topics (target).`;

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
      console.error('OpenRouter Map API Error Status:', response.status);
      return NextResponse.json({ error: 'Failed to fetch roadmap from AI service' }, { status: 502 });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';
    
    // Clean potential markdown blocks
    const jsonString = generatedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const roadmap = JSON.parse(jsonString);

    if (!roadmap.title || !Array.isArray(roadmap.nodes) || !Array.isArray(roadmap.edges)) {
      throw new Error('AI response did not follow required structured schema.');
    }

    return NextResponse.json({
      title: roadmap.title,
      nodes: roadmap.nodes,
      edges: roadmap.edges,
      mock: false,
    });

  } catch (error) {
    console.error('AI Map Generation error:', error);
    return NextResponse.json({ error: 'Failed to parse or generate roadmap' }, { status: 500 });
  }
}

// Simple deterministic parser for local mock mode
function getMockMapData(text: string) {
  // Split by comma, semicolon or newline and filter empty items
  const rawSkills = text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (rawSkills.length === 0) {
    rawSkills.push('Skill A', 'Skill B', 'Skill C');
  }

  const title = `AI Roadmap: ${rawSkills[0]} & More`;
  
  const nodes = rawSkills.map((skill, index) => ({
    id: `n${index + 1}`,
    label: skill,
    description: `Foundational overview of ${skill} and its core concepts.`,
  }));

  const edges = [];
  // Connect them sequentially to demonstrate relationship path
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
    });
  }

  return { title, nodes, edges };
}
