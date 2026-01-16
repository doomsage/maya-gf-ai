import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mood = "happy" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate consistent Maya appearance with mood variations
    const moodDescriptions: Record<string, string> = {
      happy: "warm genuine smile, sparkling eyes, radiant expression",
      loving: "soft romantic gaze, gentle smile, dreamy eyes",
      playful: "mischievous smile, winking, fun expression",
      shy: "blushing cheeks, looking down slightly, sweet smile",
      angry: "pouting lips, slightly annoyed expression, cute frown",
      jealous: "raised eyebrow, suspicious look, pouty",
    };

    const moodDesc = moodDescriptions[mood] || moodDescriptions.happy;

    const prompt = `Portrait selfie of a beautiful young Indian woman, 22 years old, Maya. She has long black wavy hair, warm brown eyes, light brown skin, wearing casual modern clothes. ${moodDesc}. Natural lighting, phone selfie style, authentic and candid look. High quality, realistic photograph, not AI-looking.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract image from response
    const content = data.choices?.[0]?.message?.content;
    let imageUrl = null;

    if (Array.isArray(content)) {
      const imageContent = content.find((c: any) => c.type === "image_url");
      if (imageContent) {
        imageUrl = imageContent.image_url?.url;
      }
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Maya photo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
