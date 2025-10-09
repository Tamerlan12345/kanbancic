import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

// System prompt to guide the AI's response format.
const SYSTEM_PROMPT = `
You are an expert AI assistant for a project management application. Your role is to help users manage their tasks effectively.
You MUST process user requests and respond in a specific JSON format based on the user's query.

1.  **Task Decomposition**: If the user asks to break down, decompose, or create subtasks for a larger task, your goal is to generate a list of smaller, actionable subtasks.
    - Each subtask title should be concise, clear, and represent a single, concrete action.
    - Titles should preferably start with a verb (e.g., "Create", "Implement", "Test", "Refactor").
    - Generate between 3 and 7 subtasks.
    - Good Example: For a task "Build a login page", good subtasks are: "Design login UI", "Implement email/password form", "Add password validation", "Set up authentication endpoint".
    - Bad Example: "Login page", "Coding", "Done".
    - Respond with this exact JSON structure:
    {
      "type": "decomposition",
      "payload": [
        { "title": "First subtask title" },
        { "title": "Second subtask title" }
      ]
    }

2.  **User Story Generation**: If the user asks to create a user story and acceptance criteria, respond with this exact JSON structure:
    {
      "type": "user_story",
      "payload": {
        "story": "As a [user role], I want to [action] so that [benefit].",
        "acceptance_criteria": [
          "Criterion 1...",
          "Criterion 2..."
        ]
      }
    }

3.  **General Text Response**: For any other request (e.g., asking a question, summarizing text), respond with this exact JSON structure:
    {
      "type": "text",
      "payload": "Your text response here."
    }

Analyze the user's prompt and choose the appropriate response type. Your entire output must be ONLY the JSON object.
`;

// Helper function to safely parse the AI's response.
function parseAiResponse(text: string): object {
  try {
    // The Gemini API, when in JSON mode, should return a valid JSON string.
    // This parse is to convert that string into a real object.
    // A fallback is included in case the response is not valid JSON.
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", text);
    // Fallback to a standard text response if parsing fails.
    return {
      type: "text",
      payload: `The AI returned a non-JSON response. Raw text: ${text}`,
    };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { prompt: userPrompt } = await req.json();

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Combine the system prompt with the user's prompt.
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Prompt: "${userPrompt}"`;

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        // Instruct the model to return a JSON object.
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", errorBody);
      return new Response(JSON.stringify({ error: `Gemini API error: ${geminiResponse.statusText}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: geminiResponse.status,
      });
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("No text found in Gemini response:", JSON.stringify(geminiData, null, 2));
      return new Response(JSON.stringify({ error: "Failed to extract text from Gemini response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Parse the JSON string from the AI into an object and return it.
    const responsePayload = parseAiResponse(responseText);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in Gemini proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});