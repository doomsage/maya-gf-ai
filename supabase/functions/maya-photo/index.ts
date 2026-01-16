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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "user", content: prompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited");
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
    console.log("Image API response received");
    
    // Extract image from the correct response format
    const images = data.choices?.[0]?.message?.images;
    let imageUrl = null;

    if (images && images.length > 0) {
      imageUrl = images[0]?.image_url?.url;
      console.log("Image URL extracted successfully");
    } else {
      console.log("No images in response, checking content...");
      // Fallback check in content
      const content = data.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        const imageContent = content.find((c: any) => c.type === "image_url");
        if (imageContent) {
          imageUrl = imageContent.image_url?.url;
        }
      }
    }

    if (!imageUrl) {
      console.error("No image URL found in response:", JSON.stringify(data).slice(0, 500));
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
