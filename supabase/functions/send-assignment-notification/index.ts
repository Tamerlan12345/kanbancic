import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// A simple email sending simulation.
// In a production environment, this would be replaced with a real email client
// like Resend, SendGrid, or Postmark.
async function sendEmail(to: string, subject: string, body: string) {
  console.log("--- Sending Email ---");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log("--- Email Sent (Simulated) ---");
  // In a real implementation, you would await the response from your email provider.
  return Promise.resolve();
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const {
      assignee_email,
      assignee_name,
      task_title,
      task_id,
      project_name,
      project_id,
    } = await req.json();

    // Construct the email content.
    const subject = `You've been assigned a new task: "${task_title}"`;
    const taskUrl = `${Deno.env.get('VITE_BASE_URL') || 'http://localhost:5173'}/kanban?projectId=${project_id}&taskId=${task_id}`;

    const body = `
      Hi ${assignee_name || 'there'},

      You have been assigned a new task in the project "${project_name}".

      Task: ${task_title}

      You can view the task here:
      ${taskUrl}

      Thanks,
      The Quantum PM Team
    `;

    // Send the notification email.
    await sendEmail(assignee_email, subject, body.trim());

    return new Response(JSON.stringify({ message: "Notification sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});