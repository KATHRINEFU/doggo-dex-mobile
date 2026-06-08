import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

// Complete dog breed database
const DOG_BREEDS = [
  {
    id: "labrador-retriever",
    name: "Labrador Retriever",
    description: "America's most popular dog for decades! Labs are friendly, outgoing, and great with families. They love swimming and fetching.",
    origin: "Canada",
    size: "large" as const,
    temperament: "Friendly, Active, Outgoing",
    lifespan: "10-12 years",
    imageUrl: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400",
    group: "Sporting",
    rarity: "common" as const,
  },
  {
    id: "french-bulldog",
    name: "French Bulldog",
    description: "Bat-eared charmers who are playful and adaptable. Frenchies are excellent city dogs who love lounging with their humans.",
    origin: "France",
    size: "small" as const,
    temperament: "Adaptable, Playful, Smart",
    lifespan: "10-12 years",
    imageUrl: "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=400",
    group: "Non-Sporting",
    rarity: "common" as const,
  },
  {
    id: "golden-retriever",
    name: "Golden Retriever",
    description: "Joyful, devoted, and friendly! Goldens are trustworthy family dogs with a love for outdoor adventures and water.",
    origin: "Scotland",
    size: "large" as const,
    temperament: "Friendly, Reliable, Trustworthy",
    lifespan: "10-12 years",
    imageUrl: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400",
    group: "Sporting",
    rarity: "common" as const,
  },
  {
    id: "german-shepherd",
    name: "German Shepherd",
    description: "Confident, courageous, and smart! GSDs are incredibly versatile working dogs used in police and military roles worldwide.",
    origin: "Germany",
    size: "large" as const,
    temperament: "Confident, Courageous, Smart",
    lifespan: "7-10 years",
    imageUrl: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400",
    group: "Herding",
    rarity: "common" as const,
  },
  {
    id: "poodle",
    name: "Poodle",
    description: "One of the smartest breeds! Poodles are elegant, proud, and very clever — they excel at dog sports and love to learn.",
    origin: "Germany/France",
    size: "medium" as const,
    temperament: "Intelligent, Active, Alert",
    lifespan: "10-18 years",
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    group: "Non-Sporting",
    rarity: "common" as const,
  },
  {
    id: "bulldog",
    name: "Bulldog",
    description: "Wrinkly, lovable, and surprisingly gentle. Bulldogs are calm and courageous, making them fantastic companions for apartment living.",
    origin: "England",
    size: "medium" as const,
    temperament: "Friendly, Courageous, Calm",
    lifespan: "8-10 years",
    imageUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400",
    group: "Non-Sporting",
    rarity: "common" as const,
  },
  {
    id: "beagle",
    name: "Beagle",
    description: "Curious, merry, and friendly! Beagles are scent hounds with a nose that's always to the ground and a howl that's hard to miss.",
    origin: "England",
    size: "small" as const,
    temperament: "Merry, Friendly, Curious",
    lifespan: "10-15 years",
    imageUrl: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400",
    group: "Hound",
    rarity: "common" as const,
  },
  {
    id: "rottweiler",
    name: "Rottweiler",
    description: "Loyal, loving, and confident guardians. Rotties are calm and devoted family protectors with a teddy-bear heart underneath.",
    origin: "Germany",
    size: "large" as const,
    temperament: "Loyal, Loving, Confident",
    lifespan: "9-10 years",
    imageUrl: "https://images.unsplash.com/photo-1567752881298-894bb81f9379?w=400",
    group: "Working",
    rarity: "uncommon" as const,
  },
  {
    id: "yorkshire-terrier",
    name: "Yorkshire Terrier",
    description: "Tiny but feisty! Yorkies pack a huge personality into a small body. They're affectionate yet bold and make great watchdogs.",
    origin: "England",
    size: "small" as const,
    temperament: "Affectionate, Sprightly, Tomboyish",
    lifespan: "11-15 years",
    imageUrl: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400",
    group: "Toy",
    rarity: "common" as const,
  },
  {
    id: "dachshund",
    name: "Dachshund",
    description: "Long-bodied and short-legged, Dachshunds are clever and lively. Originally bred to hunt badgers, they still love to dig!",
    origin: "Germany",
    size: "small" as const,
    temperament: "Stubborn, Devoted, Playful",
    lifespan: "12-16 years",
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
    group: "Hound",
    rarity: "common" as const,
  },
  {
    id: "siberian-husky",
    name: "Siberian Husky",
    description: "Striking and mischievous, Huskies are born to run. These pack dogs love adventure and have a wolf-like beauty that turns heads.",
    origin: "Siberia, Russia",
    size: "medium" as const,
    temperament: "Outgoing, Mischievous, Loyal",
    lifespan: "12-14 years",
    imageUrl: "https://images.unsplash.com/photo-1547406526-a7f0d36d9f6a?w=400",
    group: "Working",
    rarity: "uncommon" as const,
  },
  {
    id: "boxer",
    name: "Boxer",
    description: "Playful, bright, and energetic! Boxers are known for their exuberant personality and their love of jumping on people they like.",
    origin: "Germany",
    size: "large" as const,
    temperament: "Fun-Loving, Bright, Active",
    lifespan: "10-12 years",
    imageUrl: "https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?w=400",
    group: "Working",
    rarity: "uncommon" as const,
  },
  {
    id: "shih-tzu",
    name: "Shih Tzu",
    description: "Regal and outgoing! Shih Tzus were bred to be companions for Chinese royalty. They love cuddling and being the center of attention.",
    origin: "Tibet/China",
    size: "small" as const,
    temperament: "Affectionate, Playful, Outgoing",
    lifespan: "10-18 years",
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    group: "Toy",
    rarity: "uncommon" as const,
  },
  {
    id: "doberman-pinscher",
    name: "Doberman Pinscher",
    description: "Sleek and powerful with a loyal heart. Dobermans are highly intelligent working dogs and devoted family protectors.",
    origin: "Germany",
    size: "large" as const,
    temperament: "Loyal, Fearless, Alert",
    lifespan: "10-12 years",
    imageUrl: "https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?w=400",
    group: "Working",
    rarity: "uncommon" as const,
  },
  {
    id: "great-dane",
    name: "Great Dane",
    description: "The gentle giant! Great Danes are friendly and patient despite their massive size. They're known as the 'Apollo of Dogs.'",
    origin: "Germany",
    size: "giant" as const,
    temperament: "Friendly, Patient, Dependable",
    lifespan: "7-10 years",
    imageUrl: "https://images.unsplash.com/photo-1536505386430-7e6b3a98a900?w=400",
    group: "Working",
    rarity: "rare" as const,
  },
  {
    id: "australian-shepherd",
    name: "Australian Shepherd",
    description: "Smart and work-oriented! Aussies are tireless herding dogs with stunning merle coats and a love for having a job to do.",
    origin: "United States",
    size: "medium" as const,
    temperament: "Smart, Work-Oriented, Exuberant",
    lifespan: "12-15 years",
    imageUrl: "https://images.unsplash.com/photo-1503256207526-0d5523f39d6b?w=400",
    group: "Herding",
    rarity: "uncommon" as const,
  },
  {
    id: "border-collie",
    name: "Border Collie",
    description: "The world's premier sheep-herding dog. Border Collies are obsessive workers with lightning-fast reflexes and an intense stare.",
    origin: "Anglo-Scottish border",
    size: "medium" as const,
    temperament: "Energetic, Intelligent, Responsive",
    lifespan: "12-15 years",
    imageUrl: "https://images.unsplash.com/photo-1503256207526-0d5523f39d6b?w=400",
    group: "Herding",
    rarity: "rare" as const,
  },
  {
    id: "miniature-schnauzer",
    name: "Miniature Schnauzer",
    description: "Fearless and friendly! Mini Schnauzers are sturdy little dogs with a distinctive bearded face and big, spirited personality.",
    origin: "Germany",
    size: "small" as const,
    temperament: "Friendly, Smart, Obedient",
    lifespan: "12-15 years",
    imageUrl: "https://images.unsplash.com/photo-1519098635131-4c8f806d1e82?w=400",
    group: "Terrier",
    rarity: "uncommon" as const,
  },
  {
    id: "cavalier-king-charles-spaniel",
    name: "Cavalier King Charles Spaniel",
    description: "Sweet, gentle, and graceful! Cavaliers are the perfect lap dog but still love outdoor activities. Pure royalty in small packages.",
    origin: "United Kingdom",
    size: "small" as const,
    temperament: "Gentle, Graceful, Affectionate",
    lifespan: "12-15 years",
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    group: "Toy",
    rarity: "rare" as const,
  },
  {
    id: "pomeranian",
    name: "Pomeranian",
    description: "Fluffy and foxy! Pomeranians are vivacious little extroverts who think they're much bigger than they are. Full of attitude!",
    origin: "Germany/Poland",
    size: "small" as const,
    temperament: "Lively, Bold, Inquisitive",
    lifespan: "12-16 years",
    imageUrl: "https://images.unsplash.com/photo-1594839329955-3d4f06a28ea3?w=400",
    group: "Toy",
    rarity: "uncommon" as const,
  },
  {
    id: "shetland-sheepdog",
    name: "Shetland Sheepdog",
    description: "A miniature Lassie! Shelties are intensely loyal to their families and excel at agility competitions with their nimble bodies.",
    origin: "Scotland",
    size: "small" as const,
    temperament: "Loyal, Hardworking, Playful",
    lifespan: "12-14 years",
    imageUrl: "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5b?w=400",
    group: "Herding",
    rarity: "uncommon" as const,
  },
  {
    id: "havanese",
    name: "Havanese",
    description: "Cuba's national dog! Havanese are springy, curious, and social. They thrive on human companionship and adapt to any lifestyle.",
    origin: "Cuba",
    size: "small" as const,
    temperament: "Responsive, Outgoing, Funny",
    lifespan: "14-16 years",
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    group: "Toy",
    rarity: "rare" as const,
  },
  {
    id: "cane-corso",
    name: "Cane Corso",
    description: "An ancient Italian mastiff bred as a guardian. The Cane Corso is powerful, loyal, and serious — not for inexperienced owners.",
    origin: "Italy",
    size: "large" as const,
    temperament: "Affectionate, Intelligent, Majestic",
    lifespan: "9-12 years",
    imageUrl: "https://images.unsplash.com/photo-1567752881298-894bb81f9379?w=400",
    group: "Working",
    rarity: "rare" as const,
  },
  {
    id: "samoyed",
    name: "Samoyed",
    description: "The smiling white cloud! Samoyeds have a permanent smile thanks to their upturned mouth corners. They're gentle and devoted companions.",
    origin: "Siberia, Russia",
    size: "medium" as const,
    temperament: "Adaptable, Friendly, Gentle",
    lifespan: "12-14 years",
    imageUrl: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=400",
    group: "Working",
    rarity: "rare" as const,
  },
  {
    id: "shiba-inu",
    name: "Shiba Inu",
    description: "The iconic Japanese dog! Shibas are alert and spirited with a bold personality. They're also internet famous for their dramatic expressions.",
    origin: "Japan",
    size: "small" as const,
    temperament: "Alert, Active, Attentive",
    lifespan: "13-16 years",
    imageUrl: "https://images.unsplash.com/photo-1567647753830-de3fe7ce9f28?w=400",
    group: "Non-Sporting",
    rarity: "rare" as const,
  },
  {
    id: "bernese-mountain-dog",
    name: "Bernese Mountain Dog",
    description: "A majestic tri-colored giant from the Swiss Alps. Berners are calm, gentle, and strong — originally used to pull carts.",
    origin: "Switzerland",
    size: "large" as const,
    temperament: "Good-Natured, Calm, Strong",
    lifespan: "7-10 years",
    imageUrl: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400",
    group: "Working",
    rarity: "rare" as const,
  },
  {
    id: "whippet",
    name: "Whippet",
    description: "A greyhound in miniature! Whippets are lightning-fast yet incredibly gentle and calm at home. They're the 'poor man's racehorse.'",
    origin: "England",
    size: "medium" as const,
    temperament: "Calm, Affectionate, Playful",
    lifespan: "12-15 years",
    imageUrl: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400",
    group: "Hound",
    rarity: "rare" as const,
  },
  {
    id: "chow-chow",
    name: "Chow Chow",
    description: "Ancient and lion-like! Chow Chows are one of the oldest breeds with a distinctive blue-black tongue and aloof, cat-like personality.",
    origin: "China",
    size: "medium" as const,
    temperament: "Dignified, Bright, Serious-Minded",
    lifespan: "8-12 years",
    imageUrl: "https://images.unsplash.com/photo-1534361960057-19f4434a5d56?w=400",
    group: "Non-Sporting",
    rarity: "rare" as const,
  },
  {
    id: "basenji",
    name: "Basenji",
    description: "The barkless dog from Africa! Basenjis yodel instead of bark and are fastidiously clean — they groom themselves like cats.",
    origin: "Central Africa",
    size: "small" as const,
    temperament: "Independent, Smart, Poised",
    lifespan: "13-14 years",
    imageUrl: "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5b?w=400",
    group: "Hound",
    rarity: "legendary" as const,
  },
  {
    id: "saluki",
    name: "Saluki",
    description: "One of the oldest dog breeds! Ancient pharaohs kept Salukis for hunting. They're elegant, fast, and deeply devoted to one person.",
    origin: "Middle East",
    size: "medium" as const,
    temperament: "Gentle, Dignified, Independent",
    lifespan: "12-14 years",
    imageUrl: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400",
    group: "Hound",
    rarity: "legendary" as const,
  },
  {
    id: "tibetan-mastiff",
    name: "Tibetan Mastiff",
    description: "An ancient guardian of the Himalayas! Tibetan Mastiffs are massive, bear-like dogs that were sold for millions in China as status symbols.",
    origin: "Tibet",
    size: "giant" as const,
    temperament: "Tenacious, Strong-Willed, Intelligent",
    lifespan: "10-12 years",
    imageUrl: "https://images.unsplash.com/photo-1534361960057-19f4434a5d56?w=400",
    group: "Working",
    rarity: "legendary" as const,
  },
  {
    id: "azawakh",
    name: "Azawakh",
    description: "A West African sighthound of breathtaking elegance. Azawakhs are extremely rare outside Africa and bond intensely with one family.",
    origin: "West Africa",
    size: "medium" as const,
    temperament: "Affectionate, Rugged, Attentive",
    lifespan: "12-15 years",
    imageUrl: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400",
    group: "Hound",
    rarity: "legendary" as const,
  },
];

router.get("/dogs/breeds", (req, res) => {
  res.json(DOG_BREEDS);
});

router.get("/dogs/breeds/:id", (req, res) => {
  const breed = DOG_BREEDS.find((b) => b.id === req.params.id);
  if (!breed) {
    return res.status(404).json({ error: "not_found", message: "Breed not found" });
  }
  return res.json(breed);
});

router.post("/dogs/detect", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64: string;
    mimeType?: string;
  };

  if (!imageBase64) {
    return res.status(400).json({ error: "bad_request", message: "imageBase64 is required" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      max_completion_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: `Analyze this image and identify the dog breed. Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "isDog": true or false,
  "breedName": "exact breed name or empty string",
  "confidence": number between 0 and 1,
  "funFact": "one interesting fun fact about this breed in 1-2 sentences"
}
If no dog is present, set isDog to false and leave breedName empty.`,
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    let parsed: {
      isDog?: boolean;
      breedName?: string;
      confidence?: number;
      funFact?: string;
    } = {};

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
    }

    if (!parsed.isDog) {
      return res.json({
        breedId: "",
        breedName: "",
        confidence: 0,
        description: "No dog detected in this image. Try a clearer photo!",
        isDog: false,
      });
    }

    // Find matching breed in our database (case-insensitive fuzzy match)
    const detectedName = (parsed.breedName ?? "").toLowerCase();
    const matched = DOG_BREEDS.find((b) => {
      const bn = b.name.toLowerCase();
      return (
        bn === detectedName ||
        bn.includes(detectedName) ||
        detectedName.includes(bn) ||
        bn.split(" ").some((word) => detectedName.includes(word) && word.length > 4)
      );
    });

    return res.json({
      breedId: matched?.id ?? "",
      breedName: parsed.breedName ?? "Unknown Breed",
      confidence: parsed.confidence ?? 0.8,
      description: parsed.funFact ?? `A wonderful ${parsed.breedName ?? "dog"} spotted!`,
      isDog: true,
    });
  } catch (err) {
    req.log?.error({ err }, "Breed detection error");
    return res.status(500).json({ error: "detection_error", message: "Failed to analyze image" });
  }
});

export default router;
