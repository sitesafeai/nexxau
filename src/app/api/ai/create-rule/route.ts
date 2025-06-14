import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const prompt = `
      Create a safety alert rule based on the following description: "${description}"
      
      The rule should be returned in JSON format with the following structure:
      {
        "name": "string",
        "description": "string",
        "type": "string (one of: proximity, speed, area_entry, area_exit, idle_time, unauthorized_access, equipment_usage, safety_zone, crowd_density, ppe_detection)",
        "severity": "string (one of: LOW, MEDIUM, HIGH, CRITICAL)",
        "condition": {
          // Parameters specific to the rule type
        }
      }

      For example, if the description is "Alert me when a forklift gets within 10 feet of a person", the response should be:
      {
        "name": "Forklift Proximity Alert",
        "description": "Alert when a forklift is within 10 feet of a person",
        "type": "proximity",
        "severity": "HIGH",
        "condition": {
          "object1": "forklift",
          "object2": "person",
          "threshold": 10,
          "unit": "feet"
        }
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    const rule = JSON.parse(completion.choices[0].message.content);

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
} 