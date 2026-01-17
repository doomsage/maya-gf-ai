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
    const GEMINI_API_KEY = Deno.env.get("AIzaSyCGUiOXIWwaLURqiWWfH4LdVlzXDDRRY2I");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Generate consistent Maya appearance with mood variations
    const moodDescriptions: Record<string, string> = {
      happy: "warm genuine smile, sparkling happy eyes, radiant joyful expression, looking directly at camera",
      loving: "soft romantic gaze, gentle loving smile, dreamy eyes with affection",
      playful: "mischievous playful smile, winking one eye, fun teasing expression",
      shy: "blushing pink cheeks, looking down slightly with sweet shy smile",
      angry: "pouting lips, slightly furrowed brows, cute annoyed expression, arms crossed",
      jealous: "raised skeptical eyebrow, suspicious narrow eyes, pouty dramatic expression",
      nakhre: "dramatic eye roll, hand on hip, sassy annoyed but cute expression",
      sad: "slightly teary eyes, pouty sad lips, looking away dramatically",
    };

    const moodDesc = moodDescriptions[mood] || moodDescriptions.happy;

    const prompt = `Generate a beautiful portrait selfie photo of Maya: a gorgeous 22 year old Indian woman from Delhi. She has long flowing black wavy hair, warm expressive brown eyes, light brown glowing skin, wearing stylish modern Indian fusion clothes like a crop top or kurti. Current mood and expression: ${moodDesc}. The photo should look like a natural phone selfie, warm golden hour lighting, authentic candid look. Ultra high quality realistic photograph, NOT AI looking, very natural and beautiful.`;

    console.log("Generating Maya photo with mood:", mood);

    // Use Gemini's image generation model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ["image", "text"],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Image API response received");
    
    // Extract image from Gemini response
    let imageUrl = null;
    const parts = data.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          // Convert base64 to data URL
          const mimeType = part.inlineData.mimeType || "image/png";
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log("Image generated successfully");
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error("No image found in response:", JSON.stringify(data).slice(0, 500));
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
