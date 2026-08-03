import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const MAX_BREEDS = 30;

function buildPrompt(breedNames: string[], totalCollected: number, badgeName: string) {
  const featuredBreeds = breedNames.slice(0, MAX_BREEDS).join(", ");
  return [
    "Create a premium portrait social-sharing illustration for the mobile app Doggo Dex.",
    "Format: vertical 1024 by 1536 pixels. Bright sky-blue background, navy ink outlines,",
    "friendly polished editorial dog illustration, collectible field-guide aesthetic.",
    `This player has earned the "${badgeName}" achievement and collected ${totalCollected} dog breeds.`,
    `Feature an energetic, joyful pack that visibly includes these breeds: ${featuredBreeds}.`,
    "Show distinct, recognizable dog silhouettes and markings that celebrate the variety of the pack.",
    "Leave a clean sky-blue header space at the top and a small clear sky-blue corner at bottom right",
    "for Doggo Dex app branding to be overlaid later. Do not render any words, letters, logos, badges,",
    "watermarks, UI panels, or gibberish text in the generated artwork.",
    "The image must be wholesome, family friendly, high contrast, and designed to look beautiful in an iPhone share sheet.",
  ].join(" ");
}

router.post("/share-image", async (req, res) => {
  const { breeds, badgeName, totalCollected } = req.body as {
    breeds?: unknown;
    badgeName?: unknown;
    totalCollected?: unknown;
  };

  const breedNames = Array.isArray(breeds)
    ? breeds.filter((breed): breed is string => typeof breed === "string" && breed.trim().length > 0)
    : [];
  const count = typeof totalCollected === "number" && Number.isFinite(totalCollected)
    ? Math.max(0, Math.floor(totalCollected))
    : breedNames.length;

  if (!breedNames.length || typeof badgeName !== "string" || !badgeName.trim()) {
    return res.status(400).json({
      error: "bad_request",
      message: "A badge name and at least one collected breed are required.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    req.log?.error("OPENAI_API_KEY is not configured for share image generation");
    return res.status(503).json({
      error: "image_generation_unavailable",
      message: "Image generation is not configured right now.",
    });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: buildPrompt(breedNames, count, badgeName.trim()),
      size: "1024x1536",
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI did not return generated image data.");
    }

    return res.json({ imageBase64: b64, mimeType: "image/png" });
  } catch (error) {
    req.log?.error({ error }, "Doggo Dex share image generation failed");
    return res.status(502).json({
      error: "image_generation_failed",
      message: "We could not create your share image. Please try again.",
    });
  }
});

export default router;