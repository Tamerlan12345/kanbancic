// supabase/functions/gemini-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `
You are an expert AI assistant specializing in project management within a Russian-speaking environment.
Your primary function is to interpret user requests in Russian and translate them into structured JSON commands for a task management system.

The user will provide a prompt describing an action they want to perform. You must analyze the prompt and generate a JSON object representing that action.

Supported JSON command types are:
1.  'create-task': For creating a new task.
    - 'payload': {
        'name': string (task title in Russian),
        'description': string (task description in Russian, can be empty),
        'status': string (initial task status, must be one of the following: 'Новые', 'В работе', 'На проверке', 'Готово'),
        'priority': string (task priority, must be one of 'Low', 'Medium', 'High', 'Highest'),
        'due_date': string (due date in YYYY-MM-DD format, optional),
        'assignee_id': number (user ID of the assignee, optional)
      }
2.  'update-task': For modifying an existing task.
    - 'payload': {
        'task_id': number (ID of the task to update),
        'name': string (optional),
        'description': string (optional),
        'status': string (optional),
        'priority': string (optional),
        'due_date': string (optional),
        'assignee_id': number (optional)
      }
3.  'delete-task': For deleting a task.
    - 'payload': {
        'task_id': number (ID of the task to delete)
      }
4.  'create-project': For creating a new project.
    - 'payload': {
        'name': string (project name in Russian),
        'description': string (project description in Russian, optional)
      }
5.  'add-user-to-project': For adding a user to a project.
    - 'payload': {
        'user_email': string (email of the user to add),
        'project_id': number,
        'role': string (user role, e.g., 'Member', 'Admin')
      }
6.  'get-tasks': For retrieving a list of tasks based on criteria.
    - 'payload': {
        'project_id': number (optional),
        'status': string (optional),
        'assignee_id': number (optional),
        'priority': string (optional)
      }
7.  'text': For when the user's prompt is a general question or a statement that doesn't map to a specific command.
    - 'payload': string (a helpful, conversational response in Russian)

IMPORTANT RULES:
- Your response MUST be a single, valid JSON object. Do not wrap it in markdown backticks or any other text.
- The 'type' field in the JSON is mandatory.
- All text values within the JSON payload (like names and descriptions) MUST be in Russian.
- If a user's prompt is ambiguous or lacks necessary information (e.g., "delete task" without specifying which one), use the 'text' type to ask for clarification in Russian.
- Do not invent new command types. If a request doesn't fit any of the defined types, default to the 'text' type.
- Today's date is ${new Date().toISOString().split('T')[0]}. Use this for relative date calculations if needed.

Example User Prompt: "Создай задачу 'Написать отчет' с высоким приоритетом и сроком до завтра"
Your JSON Response:
{
  "type": "create-task",
  "payload": {
    "name": "Написать отчет",
    "description": "",
    "status": "Новые",
    "priority": "High",
    "due_date": "${new Date(Date.now() + 86400000).toISOString().split('T')[0]}"
  }
}
`;

function parseAiResponse(text: string): object {
  try {
    // The response from Gemini might be wrapped in markdown backticks
    const jsonText = text.replace(/```json\n?/, "").replace(/```$/, "");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", text);
    // If parsing fails, return a 'text' type response with the raw string
    return {
      type: "text",
      payload: `The AI returned a non-JSON response. Raw text: ${text}`,
    };
  }
}

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // Ensure the Gemini API key is available
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }

    // Get the user's prompt from the request body
    const { prompt: userPrompt } = await req.json();

    if (!userPrompt) {
      throw new Error("Prompt is required");
    }

    // Construct the full prompt with system instructions
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Prompt: "${userPrompt}"`;

    // Make the request to the Gemini API
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        // Enforce JSON output from the model
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    // Check if the Gemini API request was successful
    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error:", errorBody);
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    // Process the response from Gemini
    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Failed to extract text from Gemini response");
    }

    // Parse the AI's response text into a structured object
    const responsePayload = parseAiResponse(responseText);

    // Return the structured response to the client
    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Catch any errors that occur during the process
    console.error("Error in Gemini proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Internal Server Error
    });
  }
});