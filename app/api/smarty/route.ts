export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const tunnelUrl = 'https://theoretical-bathroom-dogs-frederick.trycloudflare.com/ask';
    const response = await fetch(tunnelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: message }),
    });
    const data = await response.json();
    return Response.json({ reply: data.reply });
  } catch (error) {
    console.error("Proxy Error:", error);
    return Response.json({ reply: "عذراً، لم أستطع الاتصال بالمساعد." }, { status: 500 });
  }
}
