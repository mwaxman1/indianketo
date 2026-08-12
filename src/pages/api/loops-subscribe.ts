// Placeholder for Loops API endpoint
// FLAG: Replace with real Loops API key and endpoint

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { email, referrer } = body;

    if (!email) {
      return new Response(JSON.stringify({ success: false, message: "Email is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // FLAG: Wire to real Loops API
    // const LOOPS_API_KEY = import.meta.env.LOOPS_API_KEY;
    // await fetch('https://app.loops.so/api/v1/contacts/create', { ... });

    console.log(`Newsletter signup: ${email} from ${referrer || 'unknown'}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Subscribed! Check your inbox to confirm."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: "Something went wrong. Please try again."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
