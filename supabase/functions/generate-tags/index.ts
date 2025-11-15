import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to fetch image:", imageResponse.status, imageResponse.statusText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch image", tags: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageBlob = await imageResponse.blob();
    const imageSizeMB = imageBlob.size / (1024 * 1024);
    console.log(`Processing image: ${imageSizeMB.toFixed(2)}MB, type: ${imageBlob.type}`);

    if (imageSizeMB > 20) {
      console.error("Image too large:", imageSizeMB, "MB");
      return new Response(
        JSON.stringify({ error: "Image too large", tags: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = btoa(
      String.fromCharCode(...new Uint8Array(imageArrayBuffer))
    );
    console.log("Image converted to base64, length:", imageBase64.length);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "OpenAI API key not configured",
          tags: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Calling OpenAI API...");
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image in detail and generate 10-15 descriptive tags/keywords. Include: 1) Main subjects (people, animals, objects), 2) Clothing items and colors (e.g., 'black t-shirt', 'blue jeans'), 3) Actions or activities, 4) Setting/location, 5) Mood or atmosphere, 6) Notable details. Return ONLY comma-separated tags in lowercase, no explanations or extra text.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageBlob.type};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", openAIResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "AI tagging failed",
          details: errorText,
          tags: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResult = await openAIResponse.json();
    const tagString = aiResult.choices[0]?.message?.content || "";
    console.log("OpenAI response:", tagString);
    const aiTags = tagString
      .split(",")
      .map((tag: string) => tag.trim().toLowerCase())
      .filter((tag: string) => tag.length > 0);

    console.log("Generated tags:", aiTags);
    return new Response(
      JSON.stringify({ tags: aiTags }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Tag generation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message, tags: [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});