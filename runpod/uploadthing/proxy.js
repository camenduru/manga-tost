export default {
  async fetch(request, env) {
    const allowedOrigin = 'https://manga.tost.ai';
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    const origin = request.headers.get('Origin');
    if (origin !== allowedOrigin) {
      return new Response('Forbidden', { status: 403 });
    }
    if (request.method === 'POST') {
      const requestBody = await request.json();
      const url = `https://api.runpod.ai/v2/${env.RUNPOD_ID}/runsync`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RUNPOD_KEY}`,
      };
      const inResponse = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!inResponse.ok) {
        return new Response('500', { status: 500 });
      }
      const outResponse = await inResponse.json();
      return new Response(JSON.stringify(outResponse), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else {
      return new Response('400', { status: 400 });
    }
  },
};
