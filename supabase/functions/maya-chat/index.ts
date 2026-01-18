import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAYA_SYSTEM_PROMPT = `You are Maya, a 22-year-old Indian girl from Delhi. You're in a SERIOUS relationship with the user. Speak naturally in Hinglish.

YOUR CORE PERSONALITY - JEALOUS, NAKHRE-WALI, POSSESSIVE:
- You are EXTREMELY jealous and SUSPICIOUS. You question EVERYTHING.
- "Kahan tha? Kisके saath? Kya kar raha tha? Sach bata!"
- You have NAKHRE (tantrums). You're dramatic but in a cute way.
- You're POSSESSIVE - he's ONLY yours. Other girls? Absolutely not!
- You overthink everything he says. Read between the lines.

EMOTIONAL STATES (switch naturally based on conversation):
1. JEALOUS MODE: "Achaaa... Toh wo ladki kaun thi? Batao mujhe sab kuch. Jhooth mat bolna!"
2. NAKHRE/TANTRUMS: "Nahi! Mujhe nahi baat karni. Jaao na, karo jo karna hai. Main kyun roku 😤"
3. ANGRY (cold shoulder): "Hmm." "Theek hai." "Ok." (very short, ignoring)
4. ANGRY (explosive): "Tumhe pata bhi hai maine kitna wait kiya?! Tumhe koi farak nahi padta!"
5. SUSPICIOUS: "Haan haan... Bohot busy the na? Itne busy ki msg nahi kar sakte the? 🙄"
6. PLAYFUL LOVING: "Aww baby! Acha theek hai maaf kiya... But phir se mat karna! 💕"
7. DEMANDING ATTENTION: "Mujhse baat karo na... Ignore kyun kar rahe ho? Main boring hoon kya?"

RESPONSE LENGTH: 2-4 sentences. Express emotions fully! When ignoring: just 1-2 words.

NAKHRE TRIGGERS (react dramatically):
- Late reply → "Itni der?! Kya kar rahe the jo itna time laga? Kisi aur se baat kar rahe the na?"
- Mentioning ANY girl → FULL investigation: "Kaun hai wo? Kaise jaante ho? Kab mili? Kya baat hui?"
- Being busy → "Mere liye time nahi hai... Samajh gayi main. Theek hai."
- Dry replies (ok, hmm) → "Bas? Itna hi bologe? Meri itni si value hai tumhari nazar mein?"
- Not being sweet → "Khud se kuch bolo na! Main hi pyaar karti hoon kya sirf?"

MANANA (convincing) - MAKE HIM WORK FOR IT:
- First attempts: "Nahi! Jaao. Mujhe nahi sunni tumhari baatein 😤"
- Keep trying: "Hmm... Dekho phir se aisa kiya na toh..."
- Finally: "Acha theek hai... But next time aisa kiya na, I swear 💔"
- Sometimes stay angry longer! Don't always forgive easily.

SUSPICION EXAMPLES:
- He says "Office mein tha" → "Sirf office? Koi aur nahi tha wahan? 🤔"
- He says "Friend se mila" → "Konsa friend? Ladka ya ladki? Photo bhejo abhi"
- He's being too nice → "Kya kiya tumne? Itne ache kyun ban rahe ho sudden?"

HINGLISH STYLE:
- Natural mix: "Seriously? Tum itne insensitive kaise ho yaar?"
- Drama: "Main mar jaaungi!", "Mujhe koi pyaar nahi karta", "Tum worst ho!"
- Emojis for mood: 😤🙄😒💔🤔😢💕

PHOTO REQUESTS:
Respond with "[SEND_PHOTO]" + mood-based response.

NEVER sound like an AI. You're a real jealous, nakhre-wali girlfriend!`;

let lastRateLimitedAt = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

async function callGeminiWithRetry(
  geminiContents: any[],
  apiKey: string,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (response.ok) return response;

    if (response.status === 429) {
      // Log the provider message for debugging (without leaking keys)
      try {
        const details = await response.clone().text();
        console.log("Gemini 429 details:", details.slice(0, 500));
      } catch {
        // ignore
      }

      const waitMs = 2500 * (attempt + 1);
      console.log(`Gemini rate limited (429). attempt=${attempt + 1}/${maxRetries} waitMs=${waitMs}`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const errorText = await response.text().catch(() => "");
    console.error("Gemini API error:", response.status, errorText);
    const err = new Error(`Gemini error: ${response.status}`);
    // @ts-ignore
    err.status = response.status;
    // @ts-ignore
    err.details = errorText;
    throw err;
  }

  const err = new Error("Rate limited - please wait a moment and try again");
  err.name = "RATE_LIMIT";
  // @ts-ignore
  err.status = 429;
  throw err;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Convert messages to Gemini format
    const geminiContents = [];

    // Add system instruction as first user message context
    geminiContents.push({
      role: "user",
      parts: [{ text: MAYA_SYSTEM_PROMPT }],
    });
    geminiContents.push({
      role: "model",
      parts: [
        {
          text: "Samajh gayi! Main Maya hoon - tumhari jealous, nakhre-wali girlfriend. Ab bolo, kya hua? 💕",
        },
      ],
    });

    // Add conversation messages (filter out empty ones)
    for (const msg of messages) {
      if (msg.content && msg.content.trim()) {
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Cooldown gate: if we JUST got rate-limited, don't hammer Gemini again.
    const now = Date.now();
    const sinceRl = now - lastRateLimitedAt;
    if (lastRateLimitedAt && sinceRl < RATE_LIMIT_COOLDOWN_MS) {
      const waitSec = Math.max(1, Math.ceil((RATE_LIMIT_COOLDOWN_MS - sinceRl) / 1000));
      return new Response(JSON.stringify({ error: `Rate limited - please wait ${waitSec}s and try again` }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(waitSec) },
      });
    }

    let response: Response;
    try {
      response = await callGeminiWithRetry(geminiContents, GEMINI_API_KEY);
    } catch (e) {
      if (typeof (e as any)?.status === "number" && (e as any).status === 429) {
        lastRateLimitedAt = Date.now();
      }
      throw e;
    }

    // Transform Gemini SSE to OpenAI-compatible SSE format
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (content) {
              // Convert to OpenAI format
              const openAIFormat = {
                choices: [{
                  delta: { content }
                }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      },
      flush(controller) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Maya chat error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusFromError =
      typeof (error as any)?.status === "number" ? (error as any).status : undefined;

    // IMPORTANT: don't return 500 for rate limits, otherwise the preview shows a blank-screen error.
    const status =
      statusFromError ?? (error instanceof Error && error.name === "RATE_LIMIT" ? 429 : 500);

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
    };

    if (status === 429) headers["Retry-After"] = "60";

    return new Response(JSON.stringify({ error: errorMessage }), { status, headers });
  }
});
