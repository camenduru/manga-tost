export default {
    async fetch(request, env) {
      if (request.method === 'POST') {
        const requestBody = await request.json();
        const url = `https://api.runpod.ai/v2/${env.RUNPOD_ID}/runsync`;
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RUNPOD_KEY}`,
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
            'Content-Type': 'application/json'
          }
        });
      } else {
        return new Response('400', { status: 400 });
      }
    },
  };
  