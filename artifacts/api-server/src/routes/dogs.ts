import { Router } from "express";
import { getAuth } from "@clerk/express";
import OpenAI from "openai";
import sharp from "sharp";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { logger } from "../lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

const XP_PER_RARITY: Record<string, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  legendary: 150,
};

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

// TFLite model path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TFLITE_SCRIPT = path.join(__dirname, "ml/tflite_infer.py");
const TFLITE_WORKER = path.join(__dirname, "ml/tflite_worker.py");

// Confidence thresholds for TFLite → GPT fallback
const TFLITE_CONFIDENCE_THRESHOLD = 0.5;

interface TFLiteResult {
  top1: {
    stanford_index: number;
    stanford_name: string;
    dogdex_id: string | null;
    confidence: number;
  };
  top5: Array<{
    stanford_index: number;
    stanford_name: string;
    dogdex_id: string | null;
    confidence: number;
  }>;
  is_dog: boolean;
  confidence: number;
  error?: string;
}

/* -------------------------------------------------------------------------- */
// Persistent TFLite worker — model loads once, inferences are near-instant
/* -------------------------------------------------------------------------- */

import { createInterface } from "node:readline";

class TFLiteWorker {
  private child: ReturnType<typeof spawn> | null = null;
  private queue: Array<{
    resolve: (r: TFLiteResult | null) => void;
  }> = [];

  constructor() {
    this._spawn();
  }

  private _spawn() {
    this.child = spawn("python3", [TFLITE_WORKER], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = createInterface({ input: this.child.stdout! });
    rl.on("line", (line) => {
      try {
        const parsed = JSON.parse(line) as TFLiteResult;
        const item = this.queue.shift();
        if (item) item.resolve(parsed);
      } catch {
        const item = this.queue.shift();
        if (item) item.resolve(null);
      }
    });

    this.child.stderr!.on("data", (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) {
        logger.info({ msg }, "TFLite worker stderr");
      }
    });

    this.child.on("error", (err) => {
      logger.error({ err }, "TFLite worker spawn error");
      this._drainQueue(null);
      this._spawn();
    });

    this.child.on("close", (code) => {
      logger.warn({ code }, "TFLite worker exited");
      this._drainQueue(null);
      this._spawn();
    });
  }

  private _drainQueue(result: TFLiteResult | null) {
    while (this.queue.length > 0) {
      const { resolve } = this.queue.shift()!;
      resolve(result);
    }
  }

  infer(imageBase64: string): Promise<TFLiteResult | null> {
    return new Promise((resolve) => {
      this.queue.push({ resolve });
      this.child!.stdin!.write(JSON.stringify({ image: imageBase64 }) + "\n");
    });
  }
}

const tfliteWorker = new TFLiteWorker();

/**
 * Run TFLite inference via the persistent worker.
 */
function runTFLiteInference(imageBase64: string): Promise<TFLiteResult | null> {
  return tfliteWorker.infer(imageBase64);
}

const IMGS = {
  lab: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400",
  frenchie: "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=400",
  golden: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400",
  gsd: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400",
  poodle: "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=400",
  bulldog: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400",
  beagle: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400",
  rott: "https://images.unsplash.com/photo-1567752881298-894bb81f9379?w=400",
  yorkie: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400",
  dachshund: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
  husky: "https://images.unsplash.com/photo-1547406526-a7f0d36d9f6a?w=400",
  boxer: "https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?w=400",
  shih: "https://images.unsplash.com/photo-1576526165051-21494dff8b86?w=400",
  doberman: "https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?w=400",
  great_dane: "https://images.unsplash.com/photo-1536505386430-7e6b3a98a900?w=400",
  aussie: "https://images.unsplash.com/photo-1503256207526-0d5523f39d6b?w=400",
  border: "https://images.unsplash.com/photo-1637984135921-301a8d756524?w=400",
  schnauzer: "https://images.unsplash.com/photo-1519098635131-4c8f806d1e82?w=400",
  cavalier: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
  pom: "https://images.unsplash.com/photo-1594839329955-3d4f06a28ea3?w=400",
  sheltie: "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5b?w=400",
  samoyed: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=400",
  shiba: "https://images.unsplash.com/photo-1567647753830-de3fe7ce9f28?w=400",
  berner: "https://images.unsplash.com/photo-1525893277329-bbc80d5a35e1?w=400",
  whippet: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400",
  chow: "https://images.unsplash.com/photo-1534361960057-19f4434a5d56?w=400",
  generic1: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
  generic2: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400",
  generic3: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400",
  generic4: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400",
  generic5: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
  generic6: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400",
  generic7: "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=400",
  generic8: "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=400",
  generic9: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400",
  corgi: "https://images.unsplash.com/photo-1519098901909-b1553a1190af?w=400",
  pug: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
  dalmatian: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400",
  akita: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400",
  mali: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400",
  collie: "https://images.unsplash.com/photo-1617531653332-bd46c16f7d5b?w=400",
  newfie: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400",
  saint: "https://images.unsplash.com/photo-1525893277329-bbc80d5a35e1?w=400",
  greyhound: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400",
  afghan: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
};

const DOG_BREEDS = [
  // Common (40 breeds)
  {
    id: "labrador-retriever", name: "Labrador Retriever",
    description: "America's most popular dog! Labs are friendly, outgoing, and great with families. They love swimming and fetching.",
    origin: "Canada", size: "large" as const, temperament: "Friendly, Active, Outgoing", lifespan: "10-12 years", imageUrl: IMGS.lab, group: "Sporting", rarity: "common" as const,
    personality: "Sunshine personified, loves every stranger",
    humanJob: "Camp counselor who never says no",
    coffeeOrder: "Vanilla latte, extra shots",
    ancestors: "St. John's Water Dogs of Newfoundland, refined by English nobles into the ultimate retriever",
    funFact: "Labs have a water-resistant double coat and a thick otter-like tail they use as a rudder while swimming",
    popCulture: "Marley from Marley & Me, Buddy from Air Bud, and the guide dog in countless heartwarming movies",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "The AKC ranked the Labrador Retriever as America's most popular breed for 31 consecutive years, from 1991 to 2022",
  },
  {
    id: "french-bulldog", name: "French Bulldog",
    description: "Bat-eared charmers who are playful and adaptable. Frenchies are excellent city dogs who love lounging with their humans.",
    origin: "France", size: "small" as const, temperament: "Adaptable, Playful, Smart", lifespan: "10-12 years", imageUrl: IMGS.frenchie, group: "Non-Sporting", rarity: "common" as const,
    personality: "Chill socialite, strong nap opinions",
    humanJob: "Cool barista with a pointless podcast",
    coffeeOrder: "Oat milk flat white",
    ancestors: "English Bulldogs crossed with Parisian ratters, beloved by lace workers who emigrated to France",
    funFact: "French Bulldogs cannot swim and must wear life jackets near water — their dense, top-heavy bodies sink",
    popCulture: "Owned by Lady Gaga, The Rock, and Reese Witherspoon; the breed literally dethroned the Lab after 31 years",
    energyLevel: 2, apartmentFriendly: 5, chaosLevel: 2,
    randomLore: "French Bulldogs overtook the Labrador Retriever in 2022 to become America's most popular breed — ending a 31-year dynasty",
  },
  {
    id: "golden-retriever", name: "Golden Retriever",
    description: "Joyful, devoted, and friendly! Goldens are trustworthy family dogs with a love for outdoor adventures and water.",
    origin: "Scotland", size: "large" as const, temperament: "Friendly, Reliable, Trustworthy", lifespan: "10-12 years", imageUrl: IMGS.golden, group: "Sporting", rarity: "common" as const,
    personality: "Pure sunshine, delighted by everything",
    humanJob: "Teacher, coach, cries at graduation",
    coffeeOrder: "Drip coffee, way too much sugar",
    ancestors: "Tweed Water Spaniels, Flat-Coated Retrievers, and Bloodhounds, developed by Lord Tweedmouth in the Scottish Highlands",
    funFact: "Golden Retrievers have such a gentle mouth they can carry a raw egg without cracking the shell",
    popCulture: "Air Bud, Comet from Full House, Shadow from Homeward Bound, and the goodest boy in every family photo",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "President Gerald Ford's Golden Retriever Liberty gave birth to eight puppies in the White House in 1975",
  },
  {
    id: "german-shepherd", name: "German Shepherd",
    description: "Confident, courageous, and smart! GSDs are incredibly versatile working dogs used in police and military roles worldwide.",
    origin: "Germany", size: "large" as const, temperament: "Confident, Courageous, Smart", lifespan: "7-10 years", imageUrl: IMGS.gsd, group: "Herding", rarity: "common" as const,
    personality: "Secretly loves belly rubs at work",
    humanJob: "Detective who also teaches self-defense",
    coffeeOrder: "Black coffee, no sugar",
    ancestors: "Various German herding and farm dogs, standardized by Max von Stephanitz in 1899 into the ideal working dog",
    funFact: "German Shepherds have a sense of smell 10,000 times more powerful than humans — they can sniff out a cancer cell",
    popCulture: "Rin Tin Tin saved Warner Bros. from bankruptcy; Rex from Inspector Rex; Blaze from Call of the Wild",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "Rin Tin Tin was found on a WWI battlefield as a puppy and went on to star in 27 Hollywood films, earning more fan mail than any human star",
  },
  {
    id: "poodle", name: "Poodle",
    description: "One of the smartest breeds! Poodles are elegant, proud, and very clever — they excel at dog sports and love to learn.",
    origin: "Germany", size: "medium" as const, temperament: "Intelligent, Active, Alert", lifespan: "10-18 years", imageUrl: IMGS.poodle, group: "Non-Sporting", rarity: "common" as const,
    personality: "Brilliant overachiever with perfect hair",
    humanJob: "Engineer, dancer, speaks three languages",
    coffeeOrder: "Precise pour-over, 18.5 grams exactly",
    ancestors: "German water retrievers (Pudelhund), later refined in France into the aristocratic breed we know today",
    funFact: "Poodle show clips weren't vanity — the shaved patches reduced drag in water while fur tufts protected joints from cold",
    popCulture: "Rufus in 'Kim Possible,' the standard Poodle in 'Best in Show,' and the breed Napoleon gifted to Josephine",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Poodles were originally bred as water retrievers in Germany — 'Pudel' means 'to splash in water' in German",
  },
  {
    id: "bulldog", name: "Bulldog",
    description: "Wrinkly, lovable, and surprisingly gentle. Bulldogs are calm and courageous, making them fantastic companions for apartment living.",
    origin: "England", size: "medium" as const, temperament: "Friendly, Courageous, Calm", lifespan: "8-10 years", imageUrl: IMGS.bulldog, group: "Non-Sporting", rarity: "common" as const,
    personality: "Enlightened philosopher of doing nothing",
    humanJob: "Art critic, magnificent napper",
    coffeeOrder: "Decaf, by personal choice",
    ancestors: "Medieval English bull-baiting dogs, reformed into gentle companions after bull-baiting was banned in 1835",
    funFact: "Bulldogs snore so loudly they've been reported to neighbors — and almost all are born via C-section due to their head size",
    popCulture: "The mascot of Yale, the U.S. Marine Corps, and dozens of universities; Spike from Tom and Jerry",
    energyLevel: 2, apartmentFriendly: 5, chaosLevel: 1,
    randomLore: "The Bulldog's wrinkled face was originally functional — it channeled blood away from their eyes during bull-baiting fights",
  },
  {
    id: "beagle", name: "Beagle",
    description: "Curious, merry, and friendly! Beagles are scent hounds with a nose that's always to the ground and a howl that's hard to miss.",
    origin: "England", size: "small" as const, temperament: "Merry, Friendly, Curious", lifespan: "10-15 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "common" as const,
    personality: "Cheerful detective, distracted by every smell",
    humanJob: "Food critic with extraordinary nose",
    coffeeOrder: "Seasonal hazelnut, smells most interesting",
    ancestors: "Ancient scent hounds brought to England by the Normans, refined for rabbit hunting over centuries",
    funFact: "A Beagle's nose has 220 million scent receptors vs. a human's 5 million — they can smell things buried underground",
    popCulture: "Snoopy from Peanuts is the world's most famous Beagle; also Shiloh, and the dog from 'Cats & Dogs'",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 4,
    randomLore: "Beagles are the most common breed used in U.S. research facilities because of their docile temperament — a fact that has sparked decades of animal rights activism",
  },
  {
    id: "yorkshire-terrier", name: "Yorkshire Terrier",
    description: "Tiny but feisty! Yorkies pack a huge personality into a small body. They're affectionate yet bold and make great watchdogs.",
    origin: "England", size: "small" as const, temperament: "Affectionate, Sprightly, Tomboyish", lifespan: "11-15 years", imageUrl: IMGS.yorkie, group: "Toy", rarity: "common" as const,
    personality: "Big dog energy, tiny body",
    humanJob: "Executive assistant who runs everything",
    coffeeOrder: "Espresso, straight, no time wasted",
    ancestors: "Working-class terriers from Yorkshire — Waterside Terriers, Clydesdale Terriers — bred to hunt rats in mills",
    funFact: "Yorkies were originally used as rat catchers in clothing mills; their silky coat actually has the texture of human hair",
    popCulture: "Toto in The Wizard of Oz was famously played by a Cairn Terrier, but Yorkies stole many early Hollywood hearts",
    energyLevel: 3, apartmentFriendly: 5, chaosLevel: 3,
    randomLore: "A Yorkie named Smoky served in WWII, running communication wire through a pipe under a Japanese airfield — saving 40 soldiers",
  },
  {
    id: "dachshund", name: "Dachshund",
    description: "Long-bodied and short-legged, Dachshunds are clever and lively. Originally bred to hunt badgers, they still love to dig!",
    origin: "Germany", size: "small" as const, temperament: "Stubborn, Devoted, Playful", lifespan: "12-16 years", imageUrl: IMGS.dachshund, group: "Hound", rarity: "common" as const,
    personality: "Bold, stubborn, peak elongated form",
    humanJob: "Journalist who burrows into every story",
    coffeeOrder: "Very long cortado",
    ancestors: "German scent hounds selectively bred for hundreds of years to enter badger burrows and fight underground",
    funFact: "The word 'Dachshund' literally means 'badger dog' in German — and their short legs are a genetic feature, not a flaw",
    popCulture: "Wiener dog races, the Rolling Stones' famous 'Let's Spend the Night Together' album art, and countless hot dog puns",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "Kaiser Wilhelm II was so devoted to his Dachshunds that he brought them to WWI strategic meetings, reportedly causing diplomatic incidents",
  },
  {
    id: "boxer", name: "Boxer",
    description: "Playful, bright, and energetic! Boxers are known for their exuberant personality and their love of jumping on people they like.",
    origin: "Germany", size: "large" as const, temperament: "Fun-Loving, Bright, Active", lifespan: "10-12 years", imageUrl: IMGS.boxer, group: "Working", rarity: "common" as const,
    personality: "Perpetual puppy, full-body enthusiasm always",
    humanJob: "Personal trainer who also does improv",
    coffeeOrder: "Cold brew with pre-workout",
    ancestors: "German Bullenbeisser (bull-biter) crossed with Bulldogs, bred by Munich hunters for holding large game",
    funFact: "Boxers got their name from their habit of using their front paws to play and spar — they literally box",
    popCulture: "Brandy from 'See Spot Run,' and the breed is a recurring favorite in cop and action movies as the loyal K9",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 4,
    randomLore: "Boxers were among the first breeds used as police and military dogs in Germany — their intelligence and courage were unmatched in the early 20th century",
  },
  {
    id: "shih-tzu", name: "Shih Tzu",
    description: "Regal and outgoing! Shih Tzus were bred to be companions for Chinese royalty. They love cuddling and being the center of attention.",
    origin: "Tibet/China", size: "small" as const, temperament: "Affectionate, Playful, Outgoing", lifespan: "10-18 years", imageUrl: IMGS.shih, group: "Toy", rarity: "common" as const,
    personality: "Born royalty, tolerates your presence",
    humanJob: "Influencer who never carries own bags",
    coffeeOrder: "Rose latte with oat milk",
    ancestors: "Tibetan temple dogs crossed with Pekingese in the Chinese Imperial court — literally bred for the emperor's lap",
    funFact: "Shih Tzu means 'lion dog' in Mandarin — they were considered sacred representations of the Buddhist lion",
    popCulture: "Featured in the movie 'Seven Pounds' and beloved by celebrities including Mariah Carey and Nicole Richie",
    energyLevel: 2, apartmentFriendly: 5, chaosLevel: 2,
    randomLore: "During the Communist Revolution, the Shih Tzu nearly went extinct in China — the breed was saved by 14 dogs imported to England before WWII",
  },
  {
    id: "pomeranian", name: "Pomeranian",
    description: "Fluffy and foxy! Pomeranians are vivacious little extroverts who think they're much bigger than they are. Full of attitude!",
    origin: "Germany/Poland", size: "small" as const, temperament: "Lively, Bold, Inquisitive", lifespan: "12-16 years", imageUrl: IMGS.pom, group: "Toy", rarity: "common" as const,
    personality: "Tiny sun, everything revolves around them",
    humanJob: "Celebrity publicist, never off the clock",
    coffeeOrder: "Very elaborate, three tries to order",
    ancestors: "Descended from large sled dogs of the Arctic region — Queen Victoria bred them down to teacup size",
    funFact: "Pomeranians were originally 30-pound sled dogs — Queen Victoria fell in love with a small one and bred the tiny version into fashion",
    popCulture: "Two Pomeranians survived the Titanic sinking; Boo the Pomeranian had 16 million Facebook followers",
    energyLevel: 3, apartmentFriendly: 5, chaosLevel: 3,
    randomLore: "Mozart dedicated an aria to his Pomeranian named Pimperl, and Michelangelo had a Pomeranian sit beside him while painting the Sistine Chapel ceiling",
  },
  {
    id: "pug", name: "Pug",
    description: "Mischievous and charming! Pugs are even-tempered and have a love of food. Their wrinkly face and curly tail are their trademarks.",
    origin: "China", size: "small" as const, temperament: "Charming, Mischievous, Loving", lifespan: "13-15 years", imageUrl: IMGS.pug, group: "Toy", rarity: "common" as const,
    personality: "Lovable gremlin, charming by existing",
    humanJob: "Comedian whose face does everything",
    coffeeOrder: "Whipped cream on literally anything",
    ancestors: "Ancient Chinese emperors' lapdogs, possibly related to the Pekingese and Lo-Sze, brought to Europe in the 16th century",
    funFact: "A group of Pugs is called a 'grumble' — and their face wrinkles were deliberately bred to form the Chinese character for 'prince'",
    popCulture: "Frank the Pug in Men in Black, Percy in Pocahontas, and Otis in The Adventures of Milo and Otis",
    energyLevel: 2, apartmentFriendly: 5, chaosLevel: 2,
    randomLore: "William of Orange's Pug Pompey reportedly saved his life in 1572 by alerting him to approaching Spanish assassins — the Pug became the official dog of the House of Orange",
  },
  {
    id: "maltese", name: "Maltese",
    description: "Gentle and fearless! Maltese are ancient lapdogs draped in long silky white hair. They thrive on human attention and cuddles.",
    origin: "Malta", size: "small" as const, temperament: "Gentle, Playful, Fearless", lifespan: "12-15 years", imageUrl: IMGS.generic5, group: "Toy", rarity: "common" as const,
    personality: "Ancient aristocrat, 2,000 years of poise",
    humanJob: "Luxury blogger, five stars only",
    coffeeOrder: "Chamomile tea",
    ancestors: "Ancient Mediterranean lapdogs traded by Phoenician sailors, depicted in Greek art dating back 2,500 years",
    funFact: "Maltese don't have an undercoat, which means they shed almost nothing — making them one of the most hypoallergenic breeds",
    popCulture: "Aristotle wrote about the Maltese in 350 BC; the breed was sold for extravagant sums in Elizabethan England",
    energyLevel: 2, apartmentFriendly: 5, chaosLevel: 2,
    randomLore: "Roman Emperor Claudius kept a Maltese; Mary Queen of Scots had one hidden in her skirts when she was executed in 1587",
  },
  {
    id: "chihuahua", name: "Chihuahua",
    description: "The smallest dog breed with the biggest personality! Chihuahuas are charming, graceful, and sassy — completely devoted to their person.",
    origin: "Mexico", size: "small" as const, temperament: "Charming, Graceful, Sassy", lifespan: "14-16 years", imageUrl: IMGS.generic3, group: "Toy", rarity: "common" as const,
    personality: "Napoleonic energy, smallest possible package",
    humanJob: "Startup CEO, most memorable in room",
    coffeeOrder: "Single scalding espresso shot",
    ancestors: "Descendants of the ancient Techichi dog kept by the Toltec civilization, venerated in Aztec culture",
    funFact: "Chihuahuas have the largest brain-to-body ratio of any dog breed — and they know it",
    popCulture: "The Taco Bell Chihuahua, Bruiser in Legally Blonde, and Tinkerbell in Paris Hilton's handbag",
    energyLevel: 3, apartmentFriendly: 5, chaosLevel: 4,
    randomLore: "Ancient Aztecs believed Chihuahuas guided the dead through the underworld — they were often buried alongside their owners",
  },
  {
    id: "cocker-spaniel", name: "Cocker Spaniel",
    description: "Merry, frolicsome, and trusting! Cocker Spaniels are eager to please with beautiful silky coats and big expressive eyes.",
    origin: "England/Spain", size: "medium" as const, temperament: "Merry, Trusting, Gentle", lifespan: "10-14 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "common" as const,
    personality: "Sweet, gentle, looks at you forever",
    humanJob: "Kindergarten teacher, beautiful handwriting",
    coffeeOrder: "Latte with flower art",
    ancestors: "Spaniels brought from Spain ('Espagne'), refined in England for flushing woodcock from brush",
    funFact: "Their long, floppy ears can collect food while eating — many Cocker Spaniel owners use 'snood' covers at mealtimes",
    popCulture: "Lady from Lady and the Tramp is a Cocker Spaniel — arguably the most romantic dog in cinema history",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "President Nixon's famous 'Checkers speech' saved his career — Checkers was an American Cocker Spaniel gifted to his daughters",
  },
  {
    id: "english-springer-spaniel", name: "English Springer Spaniel",
    description: "Friendly and eager to please! Springers are enthusiastic hunters and affectionate family companions with limitless energy.",
    origin: "England", size: "medium" as const, temperament: "Friendly, Playful, Obedient", lifespan: "12-14 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "common" as const,
    personality: "Boundless enthusiasm, great at everything",
    humanJob: "Adventure guide who always brings snacks",
    coffeeOrder: "Double espresso, compostable cup",
    ancestors: "Spaniels of England going back to the 14th century, named 'Springers' for how they sprang game from cover",
    funFact: "A Springer Spaniel named Buster won the Dickin Medal — the animal Victoria Cross — for sniffing out a Taliban arms cache in Afghanistan",
    popCulture: "The breed of choice for President George W. Bush; frequently seen at field trials and hunting lodges in English literature",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Springers and Cocker Spaniels were once considered the same breed — litter-mates were sorted by size, the large ones called Springers, the small ones Cockers",
  },
  {
    id: "boston-terrier", name: "Boston Terrier",
    description: "The American Gentleman! Boston Terriers are bright and amusing in a tuxedo-like coat. They're adaptable city dogs full of character.",
    origin: "United States", size: "small" as const, temperament: "Friendly, Bright, Amusing", lifespan: "11-13 years", imageUrl: IMGS.frenchie, group: "Non-Sporting", rarity: "common" as const,
    personality: "Sharp wit, never takes self seriously",
    humanJob: "Late-night comedy writer, better dressed",
    coffeeOrder: "Americano with splash of cream",
    ancestors: "A cross of English Bulldog and White English Terrier, developed entirely in Boston in the 1870s — truly all-American",
    funFact: "Boston Terriers are the first dog breed developed in the United States — the only AKC breed with 'American' in its true origin",
    popCulture: "Boston University's mascot Rhett is a Boston Terrier; the breed has appeared in countless American films and cartoons",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "Boston Terriers were originally called 'Round Heads' or 'Bull Terriers' until the AKC gave them their current name in 1891",
  },
  {
    id: "bichon-frise", name: "Bichon Frisé",
    description: "Cheerful, gentle, and playful! Bichon Frisés are cloud-like white puffballs who make friends with everyone they meet.",
    origin: "Belgium/France", size: "small" as const, temperament: "Cheerful, Gentle, Playful", lifespan: "14-15 years", imageUrl: IMGS.samoyed, group: "Non-Sporting", rarity: "common" as const,
    personality: "Incandescently cheerful, radiates pure joy",
    humanJob: "Greeting card writer, party planner",
    coffeeOrder: "Fluffy whipped coffee",
    ancestors: "Mediterranean water spaniels traded by sailors, refined in France and Belgium as court companions",
    funFact: "Bichons fell out of royal favor in the 1800s and were trained as circus performers to survive — they still excel at tricks",
    popCulture: "A favorite of French and Spanish royalty; Francis I of France was rarely seen without his Bichon",
    energyLevel: 3, apartmentFriendly: 5, chaosLevel: 2,
    randomLore: "After falling from aristocratic grace during the French Revolution, Bichons became street dogs trained as circus performers until their royal rehabilitation in the 20th century",
  },
  {
    id: "miniature-schnauzer", name: "Miniature Schnauzer",
    description: "Fearless and friendly! Mini Schnauzers are sturdy little dogs with a distinctive bearded face and big, spirited personality.",
    origin: "Germany", size: "small" as const, temperament: "Friendly, Smart, Obedient", lifespan: "12-15 years", imageUrl: IMGS.schnauzer, group: "Terrier", rarity: "common" as const,
    personality: "Clever bearded intellectual, always right",
    humanJob: "Professor who writes blistering op-eds",
    coffeeOrder: "Drip coffee, exactly one sugar",
    ancestors: "Standard Schnauzer crossed with Affenpinschers and Poodles, bred on German farms as ratters and guards",
    funFact: "Miniature Schnauzers are the only small dog in the Terrier group that does not have British origins",
    popCulture: "A beloved breed in Germany; the Mini Schnauzer is depicted in German paintings dating back to the 15th century",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "The distinctive Schnauzer beard and eyebrows were not cosmetic — they provided protection from rodent bites while the dog was working underground",
  },
  {
    id: "west-highland-white-terrier", name: "West Highland White Terrier",
    description: "Happy and self-confident! Westies are hardy little terriers with a bright white coat and a deeply loyal heart.",
    origin: "Scotland", size: "small" as const, temperament: "Happy, Hardy, Spirited", lifespan: "13-15 years", imageUrl: IMGS.samoyed, group: "Terrier", rarity: "common" as const,
    personality: "Cheerfully stubborn, does it anyway",
    humanJob: "Small business owner, their own way",
    coffeeOrder: "Strong Scottish breakfast tea",
    ancestors: "Highland terriers of Scotland, possibly developed by the Malcolm family of Poltalloch after a reddish terrier was mistaken for a fox",
    funFact: "Westies were bred white so Scottish hunters could tell them apart from foxes and dark-coated game in dense brush",
    popCulture: "Famous as the face of Black & White Scotch Whisky alongside a Scottie; also the Cesar dog food mascot",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "The white coat was deliberately selected by Col. Malcolm of Poltalloch after he accidentally shot his beloved reddish terrier, mistaking it for a fox",
  },
  {
    id: "shetland-sheepdog", name: "Shetland Sheepdog",
    description: "A miniature Lassie! Shelties are intensely loyal to their families and excel at agility competitions with their nimble bodies.",
    origin: "Scotland", size: "small" as const, temperament: "Loyal, Hardworking, Playful", lifespan: "12-14 years", imageUrl: IMGS.sheltie, group: "Herding", rarity: "common" as const,
    personality: "Brilliant honors student, always extra credit",
    humanJob: "Agility trainer who also homeschools",
    coffeeOrder: "Precisely timed pour-over",
    ancestors: "Rough Collies crossed with small Shetland working dogs, adapted to the harsh Shetland Islands climate",
    funFact: "Shelties are ranked the 6th most intelligent dog breed and can learn a new command in less than 5 repetitions",
    popCulture: "Often confused with Lassie; Shelties appear frequently in dog sport competitions where their agility is legendary",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Shetland Sheepdogs were kept small not for aesthetics but practicality — on the Shetland Islands, small animals consumed far less of the scarce food supply",
  },
  {
    id: "cairn-terrier", name: "Cairn Terrier",
    description: "The original Toto from Wizard of Oz! Cairn Terriers are alert, cheerful, and love to dig. They're fearless for their small size.",
    origin: "Scotland", size: "small" as const, temperament: "Alert, Cheerful, Curious", lifespan: "13-15 years", imageUrl: IMGS.generic4, group: "Terrier", rarity: "common" as const,
    personality: "Scrappy, cheerful, handles anything",
    humanJob: "Freelance reporter, works twice as hard",
    coffeeOrder: "Cheapest, strongest, no pretension",
    ancestors: "Ancient Highland terriers used to hunt otters, foxes, and rats among the rocky cairns of Scotland",
    funFact: "Cairn Terriers are named after the stone piles (cairns) where prey would hide — the dogs would dig them out fearlessly",
    popCulture: "Toto in The Wizard of Oz was a Cairn Terrier named Terry — she earned $125 a week, more than some human actors",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "Toto the Cairn Terrier, real name Terry, became so famous she was credited simply as 'Toto' in all subsequent film contracts",
  },
  {
    id: "dalmatian", name: "Dalmatian",
    description: "Spotted and spirited! Dalmatians were born to run alongside carriages. They're energetic, dignified, and loyal family protectors.",
    origin: "Croatia", size: "large" as const, temperament: "Dignified, Loyal, Energetic", lifespan: "11-13 years", imageUrl: IMGS.dalmatian, group: "Non-Sporting", rarity: "common" as const,
    personality: "Marathon runner, friends at the firehouse",
    humanJob: "Marathon runner, also a firefighter",
    coffeeOrder: "Spotty macchiato",
    ancestors: "Coach dogs of Dalmatia (modern Croatia) trained to run beneath horse carriages for miles, guarding them at rest",
    funFact: "Dalmatian puppies are born completely white — their spots develop over the first few weeks of life",
    popCulture: "101 Dalmatians by Dodie Smith and the Disney films; the iconic firehouse dog of American tradition",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 4,
    randomLore: "Dalmatians ran alongside horse-drawn fire wagons in the 1800s, calming the horses and guarding the equipment while firefighters worked — earning their permanent firehouse status",
  },
  {
    id: "papillon", name: "Papillon",
    description: "Named for their butterfly-like ears, Papillons are happy and alert. One of the most obedient toy breeds, they love agility sports.",
    origin: "France/Belgium", size: "small" as const, temperament: "Happy, Alert, Friendly", lifespan: "14-16 years", imageUrl: IMGS.generic7, group: "Toy", rarity: "common" as const,
    personality: "Tiny energetic genius, game show winner",
    humanJob: "Memory champion, black belt, six languages",
    coffeeOrder: "Espresso with butterfly latte art",
    ancestors: "Continental Toy Spaniels depicted in paintings by Rubens and Van Dyck from the 16th century",
    funFact: "Papillons consistently rank in the top 10 smartest dog breeds — they excel at obedience and agility despite their tiny size",
    popCulture: "Favored by Marie Antoinette and Louis XIV; depicted in countless Renaissance and Baroque paintings of European nobility",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 2,
    randomLore: "Marie Antoinette allegedly carried her Papillon to the guillotine — the dog, named Thisbe, reportedly waited outside the prison until she died",
  },
  {
    id: "havanese", name: "Havanese",
    description: "Cuba's national dog! Havanese are springy, curious, and social. They thrive on human companionship and adapt to any lifestyle.",
    origin: "Cuba", size: "small" as const, temperament: "Responsive, Outgoing, Funny", lifespan: "14-16 years", imageUrl: IMGS.generic5, group: "Toy", rarity: "common" as const,
    personality: "Vivacious social butterfly, knows everyone",
    humanJob: "Events coordinator, best parties ever",
    coffeeOrder: "Cuban cortado",
    ancestors: "Bichon-type dogs brought to Cuba by Spanish settlers in the 1600s, isolated and refined into Cuba's only native breed",
    funFact: "The Havanese is the only dog breed native to Cuba; they were nearly wiped out when Cuban families fled after the 1959 revolution",
    popCulture: "Ernest Hemingway owned several during his Cuba years; Charles Dickens, Queen Victoria, and Barbara Walter all kept Havanese",
    energyLevel: 3, apartmentFriendly: 5, chaosLevel: 2,
    randomLore: "After the Cuban Revolution, the Havanese almost vanished — the breed was rescued by just 11 dogs brought to the U.S. by Cuban exiles",
  },
  {
    id: "vizsla", name: "Vizsla",
    description: "Hungary's golden dog! Vizslas are gentle, loyal, and affectionate. They bond so closely to their family they're called 'Velcro dogs.'",
    origin: "Hungary", size: "medium" as const, temperament: "Affectionate, Gentle, Energetic", lifespan: "12-14 years", imageUrl: IMGS.generic6, group: "Sporting", rarity: "common" as const,
    personality: "Fiercely devoted, wildly athletic decathlete",
    humanJob: "Elite endurance athlete, works from home",
    coffeeOrder: "Pre-run espresso while already stretching",
    ancestors: "Magyar hunting dogs brought to the Carpathian Basin 1,000 years ago by the Magyars, refined by Hungarian nobles",
    funFact: "Vizslas are triple-talented pointers — they point, retrieve on land, and retrieve from water with equal skill",
    popCulture: "The Vizsla appeared in Hungarian art and literature for centuries; featured prominently in paintings of Magyar nobility on horseback",
    energyLevel: 5, apartmentFriendly: 1, chaosLevel: 3,
    randomLore: "Vizslas were nearly wiped out twice — once after WWI and again after WWII — each time saved by dedicated Hungarian breeders who smuggled dogs across borders",
  },
  {
    id: "weimaraner", name: "Weimaraner",
    description: "The Ghost Dog! Weimaraners have striking silver-grey coats and pale eyes. They're friendly, fearless, and always ready for action.",
    origin: "Germany", size: "large" as const, temperament: "Friendly, Fearless, Alert", lifespan: "11-14 years", imageUrl: IMGS.generic6, group: "Sporting", rarity: "common" as const,
    personality: "Silver-screen handsome, always looks perfect",
    humanJob: "Fashion photographer, ultramarathon runner",
    coffeeOrder: "Silver needle white tea",
    ancestors: "Developed at the Weimar court in Germany in the early 1800s, possibly from Bloodhounds crossed with German hunting dogs",
    funFact: "William Wegman's famous photographs of Weimaraners dressed in human clothes made the breed a pop-culture icon in the 1990s",
    popCulture: "William Wegman's iconic art photography; Weimaraners appeared in numerous Vogues and art exhibitions worldwide",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "German nobles guarded the Weimaraner breed so jealously that foreigners were forbidden from owning one — the first U.S. import required extraordinary political connections",
  },
  {
    id: "pointer", name: "Pointer",
    description: "Born to point! Pointers are hard-driving, wide-ranging bird dogs who are gentle and loyal at home but all-business in the field.",
    origin: "England", size: "large" as const, temperament: "Hard-Driving, Loyal, Gentle", lifespan: "12-17 years", imageUrl: IMGS.generic2, group: "Sporting", rarity: "common" as const,
    personality: "Single-mindedly focused on the task",
    humanJob: "Wildlife photographer, motionless for hours",
    coffeeOrder: "Black coffee in travel thermos",
    ancestors: "Spanish Pointers crossed with Foxhounds, Bloodhounds, and Greyhounds in 17th-century England",
    funFact: "When Pointers scent game, they freeze mid-stride in the classic 'point' — one foot raised, nose extended, tail rigid — instinctively",
    popCulture: "The quintessential hunting dog of English sporting tradition; depicted in countless paintings by Stubbs and other sporting artists",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "A Pointer named Major was documented to hold a point for over an hour — completely still, nose aimed at a covey of quail hidden in brush",
  },
  {
    id: "collie", name: "Collie",
    description: "Lassie's breed! Collies are devoted family dogs, graceful and athletic with a stunning coat and deep loyalty to their people.",
    origin: "Scotland", size: "large" as const, temperament: "Loyal, Graceful, Devoted", lifespan: "12-14 years", imageUrl: IMGS.collie, group: "Herding", rarity: "common" as const,
    personality: "Noblest friend, first to know",
    humanJob: "Crisis counselor, search and rescue volunteer",
    coffeeOrder: "Warm chamomile with honey",
    ancestors: "Scottish and Welsh herding dogs brought south after Roman times, refined in the Highlands as sheep herders",
    funFact: "Lassie's original actor, Pal, was rejected at first as too wild — he went on to be cast and outperformed every other dog on set",
    popCulture: "Lassie is the most famous Collie — a film, TV, and book franchise spanning over 80 years",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "The original Lassie dog Pal sired a dynasty — every Lassie dog on TV and film until 2019 was a direct descendant",
  },
  {
    id: "welsh-corgi-pembroke", name: "Pembroke Welsh Corgi",
    description: "The Queen's favorite! Corgis are bold, tenacious, and friendly. Their big-dog attitude in a long, low body is endlessly charming.",
    origin: "Wales", size: "small" as const, temperament: "Bold, Tenacious, Friendly", lifespan: "12-13 years", imageUrl: IMGS.corgi, group: "Herding", rarity: "common" as const,
    personality: "Cheerful herder who roasts you lovingly",
    humanJob: "Project manager, herds toward deadlines",
    coffeeOrder: "Earl Grey with milk",
    ancestors: "Believed descended from Flemish weaving dogs brought to Wales by Flemish craftsmen in the 10th century",
    funFact: "Corgis herded cattle by nipping at their heels and then dropping flat to avoid the kick — their low profile was a survival feature",
    popCulture: "Queen Elizabeth II owned over 30 Pembroke Welsh Corgis during her reign; the breed is inextricable from British royal imagery",
    energyLevel: 4, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "According to Welsh legend, Corgis were the preferred mounts of woodland fairies — you can allegedly still see the fairy saddle marks on their shoulders",
  },
  {
    id: "standard-schnauzer", name: "Standard Schnauzer",
    description: "A reliable, spirited dog! Standard Schnauzers are versatile working dogs — good-natured with family but serious when on guard.",
    origin: "Germany", size: "medium" as const, temperament: "Spirited, Reliable, Intelligent", lifespan: "13-16 years", imageUrl: IMGS.schnauzer, group: "Working", rarity: "common" as const,
    personality: "Serious middle sibling, holds it together",
    humanJob: "Operations manager with contingency plans",
    coffeeOrder: "Black coffee, same order always",
    ancestors: "The original Schnauzer from Bavaria, depicted in German paintings and sculptures as far back as the 15th century",
    funFact: "The Standard Schnauzer is the oldest of the three Schnauzer sizes — the Miniature and Giant were both bred from it",
    popCulture: "Standard Schnauzers served as messenger and Red Cross dogs in WWI; Rembrandt and Dürer both painted them",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Albrecht Dürer painted a Standard Schnauzer in multiple works between 1492 and 1504 — one of the earliest breed portraits in art history",
  },
  {
    id: "scottish-terrier", name: "Scottish Terrier",
    description: "Dignified and independent, the Scottie is a bold and jaunty little dog. They're aloof with strangers but loyal to their family.",
    origin: "Scotland", size: "small" as const, temperament: "Independent, Dignified, Alert", lifespan: "11-13 years", imageUrl: IMGS.generic9, group: "Terrier", rarity: "common" as const,
    personality: "Dignified eccentric, needs no approval",
    humanJob: "Retired judge, anonymous memoir author",
    coffeeOrder: "Single malt whisky, neat",
    ancestors: "Highland terriers of Scotland's western islands, among the oldest of all British terrier breeds",
    funFact: "Three U.S. Presidents kept Scottish Terriers: FDR's Fala, Eisenhower's Telek, and George W. Bush's Barney and Miss Beazley",
    popCulture: "FDR's Scottie Fala was so famous a political opponent claimed he was flown home at taxpayer expense — FDR's rebuttal speech became legendary",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "FDR's Scottie Fala attended the Atlantic Charter conference with Churchill and Roosevelt — and has a memorial statue alongside FDR at the National Mall in Washington",
  },
  {
    id: "old-english-sheepdog", name: "Old English Sheepdog",
    description: "The shaggy dog! OES are adaptable, gentle, and comical. Their enormous coat and rolling gait make them impossible to miss.",
    origin: "England", size: "large" as const, temperament: "Adaptable, Gentle, Funny", lifespan: "10-12 years", imageUrl: IMGS.generic1, group: "Herding", rarity: "common" as const,
    personality: "Bumbling chaos agent, always joyful",
    humanJob: "Improv comedian, never prepares, always nails",
    coffeeOrder: "Whatever was closest",
    ancestors: "English drover dogs of the West Country, possibly with Deerhound and Bearded Collie in their ancestry",
    funFact: "Old English Sheepdogs have a distinctive rolling or 'bear-like' gait — and their tail was traditionally docked to classify them as working dogs for tax exemption",
    popCulture: "The Dulux paint dog mascot since 1961; featured in 'The Shaggy Dog' and Paul McCartney's dog Martha inspired the Beatles song",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Paul McCartney's Old English Sheepdog Martha inspired the Beatles' song 'Martha My Dear' from the White Album",
  },
  {
    id: "english-setter", name: "English Setter",
    description: "Gentle and mellow off the field, yet a tireless bird dog on it. English Setters have a unique speckled 'belton' coat pattern.",
    origin: "England", size: "large" as const, temperament: "Gentle, Friendly, Mellow", lifespan: "12 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "common" as const,
    personality: "Laid-back at home, laser-focused outside",
    humanJob: "Landscape architect, relaxed then ferocious",
    coffeeOrder: "Loose-leaf tea from beautiful tin",
    ancestors: "Setting Spaniels refined in England for 400 years; Edward Laverack developed the modern show line in the 1800s",
    funFact: "The English Setter's speckled coat is called 'belton' — the term was coined after a village in Northumberland where the dogs hunted",
    popCulture: "A staple of English sporting art; depicted in paintings by George Stubbs and Francis Grant alongside landed gentry",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "There are two distinct lines of English Setters — the Laverack show line and the Llewellin field line — each kept so separate they're almost different breeds today",
  },
  {
    id: "bull-terrier", name: "Bull Terrier",
    description: "The clown of the terrier world! Bull Terriers are playful, mischievous, and full of fire. Their egg-shaped head is totally unique.",
    origin: "England", size: "medium" as const, temperament: "Playful, Mischievous, Charming", lifespan: "12-13 years", imageUrl: IMGS.bulldog, group: "Terrier", rarity: "common" as const,
    personality: "Agent of chaos, maximum intensity",
    humanJob: "Stuntperson, throws self into everything",
    coffeeOrder: "Energy drink at 7am",
    ancestors: "Bulldogs crossed with English Terriers in the 1800s for pit fighting; later bred gentler by James Hinks in Birmingham",
    funFact: "The Bull Terrier's egg-shaped head is the result of James Hinks' selective breeding in the 1860s — it's the only breed with that profile",
    popCulture: "Spuds MacKenzie, the Bud Light party dog of the 1980s; the Target mascot Bullseye is a Bull Terrier",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 4,
    randomLore: "General George Patton's Bull Terrier Willie accompanied him throughout WWII — reportedly the only creature Patton ever truly answered to",
  },
  {
    id: "portuguese-water-dog", name: "Portuguese Water Dog",
    description: "Obama's dog! Portuguese Water Dogs were bred to help fishermen herd fish and retrieve gear. They're adventurous and web-footed swimmers.",
    origin: "Portugal", size: "medium" as const, temperament: "Adventurous, Spirited, Obedient", lifespan: "11-13 years", imageUrl: IMGS.poodle, group: "Working", rarity: "common" as const,
    personality: "Hardworking water adventurer, loves a job",
    humanJob: "Marine biologist, competitive swimmer",
    coffeeOrder: "Cold brew in reusable cup",
    ancestors: "Ancient herding dogs of the Iberian Peninsula adapted for Portuguese fishing fleets along the Algarve coast",
    funFact: "Portuguese Water Dogs are born with webbed feet and a waterproof coat — they were trained to swim between boats delivering messages",
    popCulture: "Bo and Sunny Obama were Portuguese Water Dogs, chosen for their hypoallergenic qualities; they lived in the White House from 2009–2017",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 3,
    randomLore: "Portuguese Water Dogs were so vital to the Algarve fishing industry that when trawler fleets modernized in the 1930s, the breed nearly went extinct from sudden unemployment",
  },
  {
    id: "keeshond", name: "Keeshond",
    description: "The Dutch barge dog! Keeshonden are lively, intelligent, and outgoing. Their 'spectacles' — distinctive markings around the eyes — are iconic.",
    origin: "Netherlands", size: "medium" as const, temperament: "Lively, Intelligent, Outgoing", lifespan: "12-15 years", imageUrl: IMGS.samoyed, group: "Non-Sporting", rarity: "common" as const,
    personality: "Friendly watchdog, always knows you're coming",
    humanJob: "Harbor master who never sleeps in",
    coffeeOrder: "Warm stroopwafel on their coffee",
    ancestors: "Spitz-type dogs kept as companions and guards on Dutch barges along the Rhine and Zuider Zee for centuries",
    funFact: "Keeshonden were the mascot of the Dutch Patriots Party in 1781 — named after their leader Kees de Gyselaer whose dog became the symbol",
    popCulture: "The political mascot of Dutch Patriots during the 18th century political crisis; the breed's name literally means 'Kees's dog'",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 2,
    randomLore: "After the Patriots lost to the House of Orange in 1787, the Keeshond fell out of favor for a century — it was considered a symbol of the wrong political side",
  },
  {
    id: "airedale-terrier", name: "Airedale Terrier",
    description: "The King of Terriers! Airedales are the largest terrier breed — bold, clever, and versatile. They've served in both World Wars.",
    origin: "England", size: "large" as const, temperament: "Clever, Courageous, Friendly", lifespan: "11-14 years", imageUrl: IMGS.generic4, group: "Terrier", rarity: "common" as const,
    personality: "Confident overachiever, excels at everything",
    humanJob: "Military officer turned entrepreneur",
    coffeeOrder: "Large dark roast, nothing added",
    ancestors: "Old English Rough Terriers crossed with Otterhounds in the Aire Valley of Yorkshire in the mid-1800s",
    funFact: "Airedales carried messages and supplies through enemy lines in WWI — one famous Airedale named Jack delivered a message that saved a battalion, dying from his wounds upon arrival",
    popCulture: "Teddy Roosevelt owned three; Presidents Wilson and Harding also had Airedales; they were WWI's most decorated military dogs",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Jack the Airedale was mortally wounded in WWI but completed his message run — saving nearly 200 men — before collapsing and dying. He was awarded the Victoria Cross posthumously",
  },
  {
    id: "german-shorthaired-pointer", name: "German Shorthaired Pointer",
    description: "The perfect all-around hunting dog! GSPs are versatile, intelligent, and enthusiastic — they love to run and swim all day long.",
    origin: "Germany", size: "large" as const, temperament: "Friendly, Smart, Willing", lifespan: "10-12 years", imageUrl: IMGS.generic6, group: "Sporting", rarity: "common" as const,
    personality: "High-performing all-rounder, exhausting outdoors",
    humanJob: "Triathlete, wilderness guide, wildlife photographer",
    coffeeOrder: "Double espresso before 6am run",
    ancestors: "Spanish Pointer crossed with German tracking dogs, Bloodhounds, and later English Pointer to develop the ultimate versatile hunter",
    funFact: "GSPs can point, retrieve on land, retrieve from water, track wounded game, and work as family companions — all with equal proficiency",
    popCulture: "The breed of choice for serious hunters across North America and Europe; a staple of sporting magazines and outdoor literature",
    energyLevel: 5, apartmentFriendly: 1, chaosLevel: 3,
    randomLore: "The GSP was so carefully bred that German breeders required dogs to pass both field trials and conformation shows before receiving papers — dual competence was non-negotiable",
  },

  // Uncommon (30 breeds)
  {
    id: "siberian-husky", name: "Siberian Husky",
    description: "Striking and mischievous, Huskies are born to run. These pack dogs love adventure and have a wolf-like beauty that turns heads.",
    origin: "Siberia, Russia", size: "medium" as const, temperament: "Outgoing, Mischievous, Loyal", lifespan: "12-14 years", imageUrl: IMGS.husky, group: "Working", rarity: "uncommon" as const,
    personality: "Free-spirited escape artist, ignores commands",
    humanJob: "Adventure photographer, 60 countries visited",
    coffeeOrder: "Nothing, already three blocks away",
    ancestors: "Bred by the Chukchi people of Siberia for over 3,000 years as endurance sled dogs on minimal food",
    funFact: "Huskies can run 100 miles a day in temperatures as low as -75°F — their metabolism shifts to burn fat without fatigue",
    popCulture: "Balto, the sled dog who delivered diphtheria serum to Nome in 1925; Snow Dogs, Eight Below, and Iron Will",
    energyLevel: 5, apartmentFriendly: 2, chaosLevel: 5,
    randomLore: "The Nome Serum Run of 1925 required a relay of 20 sled teams; Balto's Husky team ran the final 55 miles in brutal conditions — the journey is now commemorated by the Iditarod",
  },
  {
    id: "rottweiler", name: "Rottweiler",
    description: "Loyal, loving, and confident guardians. Rotties are calm and devoted family protectors with a teddy-bear heart underneath.",
    origin: "Germany", size: "large" as const, temperament: "Loyal, Loving, Confident", lifespan: "9-10 years", imageUrl: IMGS.rott, group: "Working", rarity: "uncommon" as const,
    personality: "Stoic protector, secretly very squishy",
    humanJob: "Bodyguard who also bakes elaborate cakes",
    coffeeOrder: "Strong black coffee",
    ancestors: "Roman cattle dogs left behind in Rottweil, Germany — used for centuries to drive cattle to market",
    funFact: "Rottweilers were used by Roman legions as cattle dogs — they marched 2,000 years ago across Europe alongside soldiers",
    popCulture: "Scary movie villains misrepresent them; in reality, Rotties are therapy dogs, search-and-rescue heroes, and beloved family dogs",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "Rottweil butchers tied their money purses around Rottweiler necks when traveling to market — no one robbed a man accompanied by a Rottweiler",
  },
  {
    id: "doberman-pinscher", name: "Doberman Pinscher",
    description: "Sleek and powerful with a loyal heart. Dobermans are highly intelligent working dogs and devoted family protectors.",
    origin: "Germany", size: "large" as const, temperament: "Loyal, Fearless, Alert", lifespan: "10-12 years", imageUrl: IMGS.doberman, group: "Working", rarity: "uncommon" as const,
    personality: "Razor-sharp intellect, intimidating efficiency",
    humanJob: "Corporate attorney, wins 97% of cases",
    coffeeOrder: "Precise drip, 200°F exactly",
    ancestors: "Created in the 1880s by Louis Dobermann, a German tax collector who wanted protection on his rounds — mix of Rottweiler, Weimaraner, German Pinscher",
    funFact: "In WWII, 25 Dobermans died taking Guam — they are honored at the 'Always Faithful' war dog memorial on the island",
    popCulture: "Zeus and Apollo in Magnum P.I.; the sleek villain dog of countless 80s films; now more commonly a therapy and service dog",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "The Doberman breed was literally invented for a single person's needs — Louis Dobermann was a tax collector who needed the most intimidating protection dog possible",
  },
  {
    id: "australian-shepherd", name: "Australian Shepherd",
    description: "Smart and work-oriented! Aussies are tireless herding dogs with stunning merle coats and a love for having a job to do.",
    origin: "United States", size: "medium" as const, temperament: "Smart, Work-Oriented, Exuberant", lifespan: "12-15 years", imageUrl: IMGS.aussie, group: "Herding", rarity: "uncommon" as const,
    personality: "Type-A overachiever, always doing something",
    humanJob: "Agility coach who also farms sheep",
    coffeeOrder: "Australian flat white",
    ancestors: "Despite the name, Aussies were developed in the American West using Basque herding dogs brought from Australia in the 1800s",
    funFact: "Aussies can have two different colored eyes — heterochromia — and sometimes even split coloration within a single eye",
    popCulture: "Beloved by rodeo cowboys; frequently seen in dog sport competitions; Jay Sisler's trick-dog act with Aussies toured America in the 1950s",
    energyLevel: 5, apartmentFriendly: 1, chaosLevel: 4,
    randomLore: "The name 'Australian Shepherd' is a misnomer — the breed was developed in California and the American West by Basque shepherds who came through Australia",
  },
  {
    id: "cavalier-king-charles-spaniel", name: "Cavalier King Charles Spaniel",
    description: "Sweet, gentle, and graceful! Cavaliers are the perfect lap dog but still love outdoor activities. Pure royalty in small packages.",
    origin: "United Kingdom", size: "small" as const, temperament: "Gentle, Graceful, Affectionate", lifespan: "12-15 years", imageUrl: IMGS.cavalier, group: "Toy", rarity: "uncommon" as const,
    personality: "Infinitely gentle, makes everyone calmer",
    humanJob: "Therapist with perfect client retention",
    coffeeOrder: "Small warm vanilla tea latte",
    ancestors: "Toy Spaniels beloved by the Stuarts, painted by Van Dyck, and named for King Charles II who was rarely seen without them",
    funFact: "King Charles II issued a royal decree that Cavalier Spaniels must be allowed in any public space — the law technically still exists in some parts of the UK",
    popCulture: "Lady from Lady and the Tramp is often presumed Cavalier; the breed is seen on Charlotte's lap in Sex and the City",
    energyLevel: 2, apartmentFriendly: 5, chaosLevel: 1,
    randomLore: "King Charles II was so obsessed with his Cavaliers that Samuel Pepys wrote in his diary that the King neglected state affairs to play with his dogs",
  },
  {
    id: "akita", name: "Akita",
    description: "Japan's national dog and symbol of loyalty! Akitas are dignified and courageous. Their unwavering loyalty is legendary — Hachiko was an Akita.",
    origin: "Japan", size: "large" as const, temperament: "Loyal, Dignified, Courageous", lifespan: "10-13 years", imageUrl: IMGS.akita, group: "Working", rarity: "uncommon" as const,
    personality: "Profound, reserved, unspeakably loyal",
    humanJob: "Master craftsman who speaks rarely",
    coffeeOrder: "Ceremonial matcha, whisked properly",
    ancestors: "Ancient spitz-type dogs of the Akita Prefecture in northern Japan, used to hunt bear and boar for the samurai class",
    funFact: "In Japan, a small Akita figurine is traditionally given to new parents and sick patients as a symbol of good health and happiness",
    popCulture: "Hachiko waited at Shibuya Station for his owner every day for 9 years after the owner's death — a bronze statue marks the spot today",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "Hachiko's loyalty became so legendary that every Japanese schoolchild learns his story; his taxidermied body is displayed at the National Science Museum in Tokyo",
  },
  {
    id: "alaskan-malamute", name: "Alaskan Malamute",
    description: "A powerful arctic sled dog, Malamutes are playful and affectionate. They're one of the oldest sled dog breeds in the world.",
    origin: "Alaska, USA", size: "large" as const, temperament: "Playful, Affectionate, Powerful", lifespan: "10-14 years", imageUrl: IMGS.husky, group: "Working", rarity: "uncommon" as const,
    personality: "Ancient powerful Viking, belly rubs essential",
    humanJob: "Expedition mountaineer, impossible loads",
    coffeeOrder: "Cowboy coffee over campfire",
    ancestors: "One of the oldest arctic breeds, developed by the Mahlemut Inuit people of western Alaska over 4,000 years",
    funFact: "Malamutes were used by the US military in WWII for Arctic search-and-rescue missions, delivering supplies in impossible terrain",
    popCulture: "Frequently confused with Huskies; Malamutes appear in Jack London's 'Call of the Wild' as the archetypal sled dog",
    energyLevel: 4, apartmentFriendly: 1, chaosLevel: 4,
    randomLore: "During WWII, the U.S. government requisitioned and sterilized all registered Alaskan Malamutes for military use — nearly destroying the pure breeding stock. Dedicated breeders rebuilt the breed from scratch after the war",
  },
  {
    id: "belgian-malinois", name: "Belgian Malinois",
    description: "The elite working dog of choice for military and police worldwide. Malinois are intensely driven, agile, and fiercely loyal.",
    origin: "Belgium", size: "medium" as const, temperament: "Confident, Hardworking, Protective", lifespan: "14-16 years", imageUrl: IMGS.mali, group: "Herding", rarity: "uncommon" as const,
    personality: "Ultimate professional, outruns and outworks all",
    humanJob: "Special forces operator, always in training",
    coffeeOrder: "Pre-workout and black coffee",
    ancestors: "One of four Belgian shepherd varieties, developed in Malines (Mechelen) Belgium in the late 1800s for herding and guarding",
    funFact: "Cairo, a Malinois, was part of SEAL Team Six during the raid that killed Osama bin Laden in 2011",
    popCulture: "Max (2015 film), the dog companion in 'John Wick,' and the go-to breed for military and police K9 units worldwide",
    energyLevel: 5, apartmentFriendly: 1, chaosLevel: 4,
    randomLore: "A Belgian Malinois named Conan was injured in the ISIS raid that killed Abu Bakr al-Baghdadi in 2019 — President Trump tweeted a photo and called her 'an incredible dog'",
  },
  {
    id: "cane-corso", name: "Cane Corso",
    description: "An ancient Italian mastiff bred as a guardian. The Cane Corso is powerful, loyal, and serious — not for inexperienced owners.",
    origin: "Italy", size: "large" as const, temperament: "Affectionate, Intelligent, Majestic", lifespan: "9-12 years", imageUrl: IMGS.rott, group: "Working", rarity: "uncommon" as const,
    personality: "Calm power, never needs to shout",
    humanJob: "Head of security, silent and thorough",
    coffeeOrder: "Dark espresso, double shot",
    ancestors: "Direct descendants of Roman war dogs (Canis Pugnax) that marched into battle alongside legions across the empire",
    funFact: "Cane Corso means 'bodyguard dog' in Italian — from the Latin 'cohors,' meaning guardian or protector",
    popCulture: "Featured in the HBO series 'The Wire' and the Godfather aesthetic; increasingly popular as a status companion for serious dog owners",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "After the fall of Rome, the Cane Corso's role shifted from war dog to farm guardian and hunter of large game — they nearly went extinct in the 1970s until Italian breeders rescued them",
  },
  {
    id: "bloodhound", name: "Bloodhound",
    description: "The scenting genius! Bloodhounds have the most powerful nose of any dog — they can track a scent trail that's days old over miles.",
    origin: "Belgium", size: "large" as const, temperament: "Stubborn, Affectionate, Gentle", lifespan: "10-12 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "uncommon" as const,
    personality: "Gentle jowly genius, unstoppable on scent",
    humanJob: "Cold case detective, decades-old evidence",
    coffeeOrder: "Rich, dark, complicated notes",
    ancestors: "Medieval Belgian hounds from the Abbey of Saint-Hubert (St. Hubert Hound), refined in England into the scenting champion",
    funFact: "A Bloodhound's nose has 300 million scent receptors — and their trailing evidence is admissible in U.S. courts",
    popCulture: "McGruff the Crime Dog is a Bloodhound; the breed appears in countless detective stories as the ultimate tracking dog",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Bloodhound evidence has been used in criminal cases for over 100 years; one Bloodhound named Nick Carter tracked a murderer 105 miles and testified in court cases that resulted in more than 600 convictions",
  },
  {
    id: "irish-setter", name: "Irish Setter",
    description: "The red-coated showstopper! Irish Setters are rollicking, sweet-natured dogs with mahogany coats and boundless enthusiasm for life.",
    origin: "Ireland", size: "large" as const, temperament: "Rollicking, Affectionate, Sweet", lifespan: "12-15 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "uncommon" as const,
    personality: "Most beautiful, most enthusiastic always",
    humanJob: "Actor, beloved on set by all",
    coffeeOrder: "Ruby red hibiscus cold brew",
    ancestors: "Irish Red and White Setters crossbred for a solid red coat in Ireland in the 17th and 18th centuries",
    funFact: "Irish Setters were the first breed to appear on an American dog show poster — their stunning red coat makes them natural showmen",
    popCulture: "Big Red from the 1962 Disney film; King Timahoe, President Nixon's beloved Irish Setter who lived in the White House",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Irish Setters were used as bird dogs but fell out of hunting favor due to their stunning appearance — breeders kept selecting for the most beautiful red coat over working ability",
  },
  {
    id: "newfoundland", name: "Newfoundland",
    description: "The gentle giant of the dog world! Newfoundlands are sweet, patient, and devoted. They're natural water rescue dogs who love to swim.",
    origin: "Canada", size: "giant" as const, temperament: "Sweet, Patient, Devoted", lifespan: "9-10 years", imageUrl: IMGS.newfie, group: "Working", rarity: "uncommon" as const,
    personality: "Gentlest soul, giant heart",
    humanJob: "Pediatric nurse, calms every child",
    coffeeOrder: "Massive mug of hot cocoa",
    ancestors: "Large working dogs of the island of Newfoundland, possibly crossed with Great Pyrenees or Tibetan Mastiffs by fishermen",
    funFact: "Newfoundlands are the only dog breed whose webbed feet, water-resistant coat, and bone structure were all naturally selected for aquatic rescue",
    popCulture: "Nana from Peter Pan is a Newfoundland; Lewis and Clark's Meriwether Lewis crossed America with a Newfoundland named Seaman",
    energyLevel: 2, apartmentFriendly: 2, chaosLevel: 1,
    randomLore: "Napoleon Bonaparte fell overboard crossing from Elba in 1815 — a Newfoundland reportedly jumped in and kept him afloat until rescue arrived",
  },
  {
    id: "saint-bernard", name: "Saint Bernard",
    description: "Famous Alpine rescuers! Saint Bernards are patient, gentle giants who have saved thousands of people trapped in mountain snow.",
    origin: "Switzerland", size: "giant" as const, temperament: "Patient, Gentle, Friendly", lifespan: "8-10 years", imageUrl: IMGS.saint, group: "Working", rarity: "uncommon" as const,
    personality: "Warm enormous giant, unaware of size",
    humanJob: "Mountain rescue specialist, no recognition needed",
    coffeeOrder: "Massive barrel of Swiss hot chocolate",
    ancestors: "Roman Molossian dogs crossbred with local Swiss dogs at the Great St. Bernard Hospice monastery, founded around 1050 AD",
    funFact: "The famous barrel of brandy around a Saint Bernard's neck is a myth popularized by an 1820 Edwin Landseer painting — the monks never actually used brandy kegs",
    popCulture: "Beethoven from the 1992 film franchise; the barrel myth perpetuated by countless cartoons and Christmas cards",
    energyLevel: 2, apartmentFriendly: 1, chaosLevel: 2,
    randomLore: "The most famous rescue Saint Bernard, Barry der Menschenretter, is said to have saved over 40 lives between 1800 and 1812 — his preserved body is at the Natural History Museum of Bern",
  },
  {
    id: "bullmastiff", name: "Bullmastiff",
    description: "A fearless guardian! Bullmastiffs were bred to silently track and pin poachers. They're affectionate and reliable with their families.",
    origin: "England", size: "large" as const, temperament: "Affectionate, Fearless, Reliable", lifespan: "7-9 years", imageUrl: IMGS.bulldog, group: "Working", rarity: "uncommon" as const,
    personality: "Silent, watchful, utterly calm presence",
    humanJob: "Private investigator, impeccable record",
    coffeeOrder: "Dark roast from 15-year thermos",
    ancestors: "Deliberately bred by English gamekeepers in the 1860s — 60% Mastiff, 40% Bulldog — to silently catch and hold poachers",
    funFact: "Bullmastiffs were trained to track poachers silently in the dark, pin them without biting, and hold them until the gamekeeper arrived",
    popCulture: "Sylvester Stallone's beloved Bullmastiff Butkus appeared alongside him in 'Rocky' — Stallone bought both Butkus and the dog for the film",
    energyLevel: 2, apartmentFriendly: 2, chaosLevel: 1,
    randomLore: "Bullmastiffs were bred so specifically as 'nightdog' gamekeepers that their dark-brindle coat was the preferred color — it was invisible in moonlight",
  },
  {
    id: "rhodesian-ridgeback", name: "Rhodesian Ridgeback",
    description: "The African Lion Dog! Rhodesian Ridgebacks have a distinctive ridge of hair along their back and were bred to hunt lions in Africa.",
    origin: "South Africa", size: "large" as const, temperament: "Dignified, Strong-Willed, Loyal", lifespan: "10 years", imageUrl: IMGS.generic6, group: "Hound", rarity: "uncommon" as const,
    personality: "Powerful, independent, unbothered",
    humanJob: "Field biologist in remote Africa",
    coffeeOrder: "Bitter espresso, nothing added",
    ancestors: "Khoikhoi hunting dogs crossed with European breeds by Dutch settlers in South Africa, refined in Rhodesia (Zimbabwe)",
    funFact: "The ridge along a Ridgeback's back is hair growing in the opposite direction from the rest of the coat — a trait shared with the Thai Ridgeback",
    popCulture: "Used by African hunters to bay lions — not fight them, but harass and distract them while horseback hunters made the kill",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "The ridge is caused by a dominant gene — Ridgebacks without the ridge are still purebred but are disqualified from shows and historically culled, a controversial practice",
  },
  {
    id: "chow-chow", name: "Chow Chow",
    description: "Ancient and lion-like! Chow Chows are one of the oldest breeds with a distinctive blue-black tongue and aloof, cat-like personality.",
    origin: "China", size: "medium" as const, temperament: "Dignified, Bright, Serious-Minded", lifespan: "8-12 years", imageUrl: IMGS.chow, group: "Non-Sporting", rarity: "uncommon" as const,
    personality: "Ancient, inscrutable, regal",
    humanJob: "Art museum director, unreadable expression",
    coffeeOrder: "Older than coffee, judges your choices",
    ancestors: "One of the oldest extant dog breeds, from ancient China over 2,000 years ago — possibly related to the Spitz family",
    funFact: "Chow Chows and Shar-Peis are the only dog breeds with a blue-black pigmented tongue — the reason is still not fully understood",
    popCulture: "Sigmund Freud kept Chow Chows and brought his dog Jofi to therapy sessions — claiming she calmed his patients",
    energyLevel: 2, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Tang Dynasty Emperor Tangzong is said to have kept 2,500 Chow Chows and 10,000 hunters to tend them — the most dogs ever owned by a single person in recorded history",
  },
  {
    id: "whippet", name: "Whippet",
    description: "A greyhound in miniature! Whippets are lightning-fast yet incredibly gentle and calm at home. They're the 'poor man's racehorse.'",
    origin: "England", size: "medium" as const, temperament: "Calm, Affectionate, Playful", lifespan: "12-15 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "uncommon" as const,
    personality: "35mph couch potato, pure duality",
    humanJob: "Olympic sprinter turned meditation instructor",
    coffeeOrder: "Sleek cold brew, then total rest",
    ancestors: "Greyhounds crossed with terriers in 19th-century northern England, used for rabbit coursing by working-class miners",
    funFact: "Whippets are the fastest accelerating dog breed — they can reach 35 mph from a standing start within seconds",
    popCulture: "Called the 'poor man's racehorse' — working-class English miners raced Whippets on weekends as an affordable alternative to horse racing",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 2,
    randomLore: "Whippet racing was so popular among Northern English mill workers in the 1800s that 'snap dog' competitions became a cultural institution — the dog caught a cloth rag 'snap' at the finish line",
  },
  {
    id: "bernese-mountain-dog", name: "Bernese Mountain Dog",
    description: "A majestic tri-colored giant from the Swiss Alps. Berners are calm, gentle, and strong — originally used to pull carts.",
    origin: "Switzerland", size: "large" as const, temperament: "Good-Natured, Calm, Strong", lifespan: "7-10 years", imageUrl: IMGS.berner, group: "Working", rarity: "uncommon" as const,
    personality: "Gentle giant, always calm and kind",
    humanJob: "Swiss mountain farmer who does yoga",
    coffeeOrder: "Swiss hot chocolate by the fire",
    ancestors: "Roman mastiffs crossed with Swiss herding dogs in the Berne region, working as cart-pullers, farm guards, and drivers",
    funFact: "Bernese Mountain Dogs can pull a cart 10 times their body weight — they were the working trucks of pre-industrial Swiss farms",
    popCulture: "Frequently featured in Swiss tourism and the breed has appeared in films including 'Invasion of the Body Snatchers' (1978)",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "The Bernese Mountain Dog nearly went extinct by the early 1900s — Professor Albert Heim traveled Switzerland seeking the last purebred specimens and spearheaded the revival",
  },
  {
    id: "bouvier-des-flandres", name: "Bouvier des Flandres",
    description: "A rugged Belgian herding dog! Bouviers are intelligent, loyal, and versatile — used by police, military, and as guide dogs.",
    origin: "Belgium", size: "large" as const, temperament: "Rational, Gentle, Loyal", lifespan: "10-12 years", imageUrl: IMGS.generic9, group: "Herding", rarity: "uncommon" as const,
    personality: "Methodical, powerful, completely dependable",
    humanJob: "Senior detective, three commendations",
    coffeeOrder: "Same dark roast every morning",
    ancestors: "Belgian farm dogs used for cattle driving, cart pulling, and farm work in the Flanders region",
    funFact: "The Belgian Royal Stud dog used to produce Bouviers was destroyed during WWI — the breed itself nearly followed; Bouviers served as ambulance and messenger dogs in the war",
    popCulture: "President Ronald Reagan's Bouvier des Flandres Lucky was so large and exuberant he was quietly relocated to the ranch",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "During WWI, Bouviers pulled ambulance carts, carried messages through shelled territory, and served as search dogs — their homeland was completely destroyed around them",
  },
  {
    id: "flat-coated-retriever", name: "Flat-Coated Retriever",
    description: "Forever young! Flat-Coats are described as Peter Pan dogs — they maintain their puppyish enthusiasm and optimism throughout their lives.",
    origin: "England", size: "large" as const, temperament: "Optimistic, Good-Humored, Active", lifespan: "8-10 years", imageUrl: IMGS.generic2, group: "Sporting", rarity: "uncommon" as const,
    personality: "Permanently delighted, never aged in spirit",
    humanJob: "Recess monitor who never has bad days",
    coffeeOrder: "Large frothy sprinkled drink",
    ancestors: "Developed in England from Labrador-type dogs crossed with Setter and Spaniel breeds in the mid-1800s",
    funFact: "Flat-Coated Retrievers were the most popular retriever breed in England before the Golden and Labrador eclipsed them in the 1900s",
    popCulture: "Often mistaken for Black Labrador Retrievers; far rarer but equally enthusiastic; prized in field trial circles",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Flat-Coated Retrievers peak maturity at about 3 years — and then never really lose that puppy energy, which is either wonderful or exhausting depending on your outlook",
  },
  {
    id: "nova-scotia-duck-tolling-retriever", name: "Nova Scotia Duck Tolling Retriever",
    description: "The Toller lures waterfowl by playing at the water's edge — then retrieves them. This clever reddish breed is athletic and curious.",
    origin: "Canada", size: "medium" as const, temperament: "Alert, Outgoing, Clever", lifespan: "12-14 years", imageUrl: IMGS.golden, group: "Sporting", rarity: "uncommon" as const,
    personality: "Deceptively clever, playing and working simultaneously",
    humanJob: "Con artist turned fishing guide",
    coffeeOrder: "Maple latte",
    ancestors: "Bred by the Mi'kmaq people and early European settlers in Nova Scotia using various retriever, spaniel, and setter crosses",
    funFact: "Tolling means 'luring' — the Toller plays and splashes at the water's edge to attract curious ducks, mimicking a fox, then retrieves after the hunter shoots",
    popCulture: "The smallest AKC retriever and one of the rarest; highly prized in field trial circles for their unique tolling ability",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "The Toller's luring technique was inspired by observing foxes play near the water's edge to attract waterfowl — Mi'kmaq hunters taught it to their dogs",
  },
  {
    id: "gordon-setter", name: "Gordon Setter",
    description: "Scotland's setter! Gordon Setters are stylish, substantial, and deliberate. Their black-and-tan coat is striking and distinctive.",
    origin: "Scotland", size: "large" as const, temperament: "Alert, Confident, Loyal", lifespan: "12-13 years", imageUrl: IMGS.generic2, group: "Sporting", rarity: "uncommon" as const,
    personality: "Methodical, confident, utterly loyal",
    humanJob: "Landscape photographer, worth the wait",
    coffeeOrder: "Strong Scottish breakfast tea, steeped right",
    ancestors: "Developed by the 4th Duke of Gordon at Gordon Castle in Scotland in the early 1800s from setter-type dogs",
    funFact: "Gordon Setters are the heaviest and slowest of the three setter breeds, but also the most methodical — preferred by hunters who valued accuracy over speed",
    popCulture: "Daniel Webster owned Gordon Setters; the breed's black-and-tan coloring made it distinctive in Scottish highland hunting paintings",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "The 4th Duke of Gordon's love for his setters was so well-known that he bred them specifically to find birds in the dense, challenging heather moors of his estate",
  },
  {
    id: "norwegian-elkhound", name: "Norwegian Elkhound",
    description: "One of the oldest northern dog breeds! Viking companions that hunted elk and bear. Hardy, bold, and devoted to their families.",
    origin: "Norway", size: "medium" as const, temperament: "Bold, Hardy, Devoted", lifespan: "12-15 years", imageUrl: IMGS.husky, group: "Hound", rarity: "uncommon" as const,
    personality: "Ancient Viking soul, loyal to people",
    humanJob: "Trail guide in Norway, no GPS",
    coffeeOrder: "Boiled coffee from cast iron pot",
    ancestors: "One of the oldest identifiable dog breeds, found in Norwegian archaeological sites dating back 5,000 to 7,000 years",
    funFact: "Norwegian Elkhounds hunt by finding the elk, then barking to hold it in place while running circles — never attacking — until the hunter arrives",
    popCulture: "The breed of Norse gods and Viking warriors; a Norwegian Elkhound skeleton was found in a Viking ship burial",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 3,
    randomLore: "A Norwegian Elkhound skeleton was found buried with a Viking warrior in Norway — archaeological evidence of the breed dates back nearly 7,000 years",
  },
  {
    id: "greyhound", name: "Greyhound",
    description: "The world's fastest dog, reaching 45 mph! Despite their speed, Greyhounds are incredibly gentle and love lounging as couch potatoes.",
    origin: "Egypt/England", size: "large" as const, temperament: "Gentle, Independent, Noble", lifespan: "10-13 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "uncommon" as const,
    personality: "45mph sprinter, profound napper",
    humanJob: "Olympic sprinter turned meditation instructor",
    coffeeOrder: "Gentle herbal tea while lying down",
    ancestors: "One of the world's oldest breeds, depicted in Egyptian tomb carvings and bred purely for sight-coursing over millennia",
    funFact: "Greyhounds are the second fastest animals on earth after the cheetah — and unlike cheetahs, they can sustain speed over much longer distances",
    popCulture: "Greyhound racing was once as popular as horse racing; the Greyhound bus company logo features the breed's iconic silhouette",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 1,
    randomLore: "Greyhounds are the only dog breed mentioned by name in the Bible (Proverbs 30:31 in the King James version) — 'a greyhound; an he goat also; and a king, against whom there is no rising up'",
  },
  {
    id: "chesapeake-bay-retriever", name: "Chesapeake Bay Retriever",
    description: "A uniquely American retriever! Chesapeakes were bred in Maryland's cold bay waters and have a distinctive wavy, oily coat.",
    origin: "United States", size: "large" as const, temperament: "Affectionate, Bright, Sensitive", lifespan: "10-13 years", imageUrl: IMGS.lab, group: "Sporting", rarity: "uncommon" as const,
    personality: "Tough, independent, deeply loyal",
    humanJob: "Professional waterfowl guide, charges accordingly",
    coffeeOrder: "Black coffee from battered thermos",
    ancestors: "Descended from two Newfoundland puppies rescued from a shipwreck off the Maryland coast in 1807, crossed with local hounds",
    funFact: "The Chessie's oily, wavy coat repels water and insulates in frigid temperatures — they can retrieve from icy bay water all day without hypothermia",
    popCulture: "The State Dog of Maryland; Theodore Roosevelt's favorite retriever; celebrated in Chesapeake Bay hunting tradition",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "The entire Chesapeake Bay Retriever breed traces to two Newfoundland puppies rescued from a sinking British brig in 1807 off the Maryland coast",
  },
  {
    id: "welsh-corgi-cardigan", name: "Cardigan Welsh Corgi",
    description: "The older Corgi with a long tail! Cardigans are loyal, affectionate, and smart — built low to the ground to herd cattle.",
    origin: "Wales", size: "small" as const, temperament: "Loyal, Affectionate, Smart", lifespan: "12-15 years", imageUrl: IMGS.corgi, group: "Herding", rarity: "uncommon" as const,
    personality: "Ancient, loyal, tail tells its story",
    humanJob: "Senior librarian who remembers everything",
    coffeeOrder: "Welsh Breakfast Tea, steeped precisely",
    ancestors: "Among the oldest breeds in Britain, brought to Wales by Celtic tribes around 1200 BC — possibly related to the Teckel/Dachshund family",
    funFact: "Cardigan Welsh Corgis are thousands of years older than Pembroke Welsh Corgis — they arrived in Wales with the Celts before the Vikings brought the Pembrokes",
    popCulture: "Less famous than the Pembroke but beloved by serious Corgi enthusiasts; frequently appears at Welsh cultural events",
    energyLevel: 4, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "Cardigan Welsh Corgis are considered one of the oldest dog breeds in the British Isles — archaeological evidence suggests their ancestors arrived in Wales over 3,000 years ago",
  },
  {
    id: "finnish-spitz", name: "Finnish Spitz",
    description: "Finland's national dog! The 'Barking Bird Dog' hunts by pointing with its tail and yodeling. They're red-gold and fox-like.",
    origin: "Finland", size: "medium" as const, temperament: "Lively, Friendly, Independent", lifespan: "13-15 years", imageUrl: IMGS.shiba, group: "Non-Sporting", rarity: "uncommon" as const,
    personality: "Vocal, fox-faced, deeply independent",
    humanJob: "Radio host everyone tunes in for",
    coffeeOrder: "Strong Finnish filter coffee, very dark",
    ancestors: "The original dog of ancient Finnish tribes, nearly wiped out by crossbreeding with European dogs in the 19th century and saved by Finnish hunters",
    funFact: "The Finnish Spitz 'yodels' to locate birds in trees — skilled dogs can bark up to 160 times per minute to attract both the bird and the hunter",
    popCulture: "Finland's national dog since 1979; hunting competitions award the title of 'King of the Barkers' to the dog with the best technique",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 3,
    randomLore: "The Finnish Spitz bark rate is so important to hunting that competitions judge dogs specifically on the speed, tone, and rhythm of their tree bark",
  },
  {
    id: "spinone-italiano", name: "Spinone Italiano",
    description: "Italy's ancient hunting dog! Spinones are gentle, sociable, and patient with their characteristic wiry coat and gentle expression.",
    origin: "Italy", size: "large" as const, temperament: "Gentle, Patient, Sociable", lifespan: "10-12 years", imageUrl: IMGS.generic9, group: "Sporting", rarity: "uncommon" as const,
    personality: "Gentle sage, moves at own pace",
    humanJob: "Italian chef, mastered one dish perfectly",
    coffeeOrder: "Cappuccino at exactly 10am",
    ancestors: "One of the oldest Italian pointing breeds, depicted in Titian and Andrea Mantegna paintings from the 15th and 16th centuries",
    funFact: "The Spinone's coarse, wiry coat was bred to protect them from Italian thornbrush — they retrieved from dense brush and cold marshes without injury",
    popCulture: "Featured in works by Italian Renaissance masters; a fixture of Italian countryside hunting culture for centuries",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Andrea Mantegna's 1474 fresco in the Ducal Palace in Mantua contains what appears to be a Spinone Italiano — one of the earliest breed portraits in art history",
  },
  {
    id: "giant-schnauzer", name: "Giant Schnauzer",
    description: "A powerful, dominant working dog! Giant Schnauzers are highly intelligent and energetic. They were bred to drive cattle to market.",
    origin: "Germany", size: "large" as const, temperament: "Loyal, Reliable, Powerful", lifespan: "12-15 years", imageUrl: IMGS.schnauzer, group: "Working", rarity: "uncommon" as const,
    personality: "Formidably intelligent, powerful, gives 110%",
    humanJob: "Elite K9 trainer who wrote textbook",
    coffeeOrder: "Double espresso, black",
    ancestors: "Developed in Bavaria by crossing Standard Schnauzers with black Great Danes and Bouvier des Flandres for cattle driving",
    funFact: "Giant Schnauzers were used as police and military dogs in Germany before the German Shepherd became dominant — they're still prized in European law enforcement",
    popCulture: "Used by Munich police forces from WWI through WWII; increasingly popular in European protection sports like IPO and Schutzhund",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Giant Schnauzers were almost exclusively a Bavarian breed for centuries — it was only after WWI that they gained recognition outside Germany",
  },
  {
    id: "miniature-bull-terrier", name: "Miniature Bull Terrier",
    description: "A comical little powerhouse! Mini Bull Terriers have the same egg-shaped head and playful personality as their larger counterpart in a compact package.",
    origin: "England", size: "small" as const, temperament: "Upbeat, Mischievous, Comical", lifespan: "11-13 years", imageUrl: IMGS.bulldog, group: "Terrier", rarity: "uncommon" as const,
    personality: "Maximum chaos, smallest possible container",
    humanJob: "Sketch comedian who also does parkour",
    coffeeOrder: "Grabbed off your desk accidentally",
    ancestors: "Bred from the same Bull Terrier stock as the standard, with Toy Fox Terriers added to reduce the size in the 1800s",
    funFact: "Mini Bull Terriers were briefly shown at freak shows in the Victorian era — people paid to see the tiny dog with the enormous egg-shaped head",
    popCulture: "The Bullseye Target mascot is a Bull Terrier; Mini versions have been the lovable clown-dogs of countless British dog show viewers",
    energyLevel: 4, apartmentFriendly: 4, chaosLevel: 4,
    randomLore: "Mini Bull Terriers were considered a separate variety from Standard Bull Terriers for over a century before being given full breed status by the AKC in 1991",
  },

  // Rare (20 breeds)
  {
    id: "border-collie", name: "Border Collie",
    description: "The world's premier sheep-herding dog. Border Collies are obsessive workers with lightning-fast reflexes and an intense stare.",
    origin: "Anglo-Scottish border", size: "medium" as const, temperament: "Energetic, Intelligent, Responsive", lifespan: "12-15 years", imageUrl: IMGS.border, group: "Herding", rarity: "rare" as const,
    personality: "Terrifyingly smart, intellectually starving",
    humanJob: "Neuroscientist who also runs agility school",
    coffeeOrder: "Triple espresso, awake since 4am",
    ancestors: "Old Hemp, a legendary tri-colored collie born in 1893 on the Anglo-Scottish border — virtually every Border Collie alive today descends from him",
    funFact: "A Border Collie named Chaser learned the names of 1,022 objects — the largest tested vocabulary of any non-human animal",
    popCulture: "Babe — the sheepherding pig film features Border Collies as the real workers; Rico from scientific fame for object permanence studies",
    energyLevel: 5, apartmentFriendly: 1, chaosLevel: 4,
    randomLore: "Virtually every Border Collie alive today traces back to a single dog: Old Hemp, born 1893, who herded with such an uncanny 'eye' that every shepherd wanted puppies from him",
  },
  {
    id: "great-dane", name: "Great Dane",
    description: "The gentle giant! Great Danes are friendly and patient despite their massive size. They're known as the 'Apollo of Dogs.'",
    origin: "Germany", size: "giant" as const, temperament: "Friendly, Patient, Dependable", lifespan: "7-10 years", imageUrl: IMGS.great_dane, group: "Working", rarity: "rare" as const,
    personality: "Gentle colossus, unaware of their size",
    humanJob: "Basketball player who teaches meditation",
    coffeeOrder: "Enormous cup, quantity is the point",
    ancestors: "Ancient German boar-hunting dogs, refined by German nobility from Irish Wolfhound and English Mastiff crosses",
    funFact: "Great Danes hold the world record for tallest dog — Zeus measured 44 inches tall at the shoulder and stood 7 feet 4 inches on his hind legs",
    popCulture: "Scooby-Doo is a Great Dane; Astro from The Jetsons; Marmaduke from the comic strip",
    energyLevel: 2, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Despite being called a Great Dane, the breed is 100% German — it was developed in Germany and has no historical connection to Denmark",
  },
  {
    id: "samoyed", name: "Samoyed",
    description: "The smiling white cloud! Samoyeds have a permanent smile thanks to their upturned mouth corners. They're gentle and devoted companions.",
    origin: "Siberia, Russia", size: "medium" as const, temperament: "Adaptable, Friendly, Gentle", lifespan: "12-14 years", imageUrl: IMGS.samoyed, group: "Working", rarity: "rare" as const,
    personality: "Permanently, irresistibly, genuinely happy",
    humanJob: "Teacher who also does Arctic expeditions",
    coffeeOrder: "Fluffy cloud coffee",
    ancestors: "Bred by the Samoyedic people of Siberia for over 3,000 years to herd reindeer, pull sleds, and sleep in tents with the family for warmth",
    funFact: "Samoyeds' upturned lip corners prevent drool from freezing to their faces in Arctic temperatures — evolution created the smile",
    popCulture: "Used by Fridtjof Nansen and Ernest Shackleton on Antarctic expeditions; the purest white in the dog world",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 3,
    randomLore: "Ernest Shackleton's Antarctic expedition of 1901 used Samoyeds — the breed proved so superior in polar conditions that later expeditions competed for the best Samoyed sled teams",
  },
  {
    id: "shiba-inu", name: "Shiba Inu",
    description: "The iconic Japanese dog! Shibas are alert and spirited with a bold personality. They're also internet famous for their dramatic expressions.",
    origin: "Japan", size: "small" as const, temperament: "Alert, Active, Attentive", lifespan: "13-16 years", imageUrl: IMGS.shiba, group: "Non-Sporting", rarity: "rare" as const,
    personality: "Self-possessed, dramatic, bound by no rules",
    humanJob: "Influencer, own terms, cult following",
    coffeeOrder: "Whatever you made, but RIGHT NOW",
    ancestors: "One of Japan's six native breeds, developed over 3,000 years for hunting small game in Japan's mountain terrain",
    funFact: "Shibas produce a distinctive 'Shiba scream' — a high-pitched howl of protest used during baths, nail trims, or any perceived indignity",
    popCulture: "Doge, the legendary internet meme — 'much wow, very dog, so amaze' — is a Shiba Inu named Kabosu",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "After WWII devastated Japan's dog population, the Shiba Inu was nearly extinct — dedicated breeders rebuilt the breed from three remaining bloodlines in the 1950s",
  },
  {
    id: "leonberger", name: "Leonberger",
    description: "Bred to look like a lion! Leonbergers are gentle, loving giants that were once considered the dog of royalty across Europe.",
    origin: "Germany", size: "giant" as const, temperament: "Gentle, Loving, Friendly", lifespan: "7 years", imageUrl: IMGS.newfie, group: "Working", rarity: "rare" as const,
    personality: "Regal gentle giant, quiet dignity",
    humanJob: "Foundation head, thoughtful quiet mentor",
    coffeeOrder: "Beautifully made flat white",
    ancestors: "Deliberately bred by Heinrich Essig of Leonberg, Germany, crossing Saint Bernard, Newfoundland, and Great Pyrenees to resemble the town's lion crest",
    funFact: "Leonbergers were bred specifically to look like the lion on the town crest of Leonberg — Heinrich Essig gave them to European royalty as gifts",
    popCulture: "Gifted to Napoleon III, the Prince of Wales, Otto von Bismarck, and Emperor Napoleon III; the aristocratic giant of 19th century Europe",
    energyLevel: 3, apartmentFriendly: 1, chaosLevel: 2,
    randomLore: "Almost every Leonberger alive today descends from just eight dogs — the breed was essentially destroyed twice by the two World Wars, rebuilt from near-extinction each time",
  },
  {
    id: "afghan-hound", name: "Afghan Hound",
    description: "One of the most glamorous dogs alive! Afghan Hounds are aloof and aristocratic with a flowing silky coat and remarkable speed.",
    origin: "Afghanistan", size: "large" as const, temperament: "Aloof, Clownish, Dignified", lifespan: "12-18 years", imageUrl: IMGS.afghan, group: "Hound", rarity: "rare" as const,
    personality: "Beautiful eccentric, secretly total clown",
    humanJob: "Fashion model, inexplicably good at parkour",
    coffeeOrder: "Crystal glass, aesthetically appropriate only",
    ancestors: "One of the oldest identifiable breeds, developed in the mountains of Afghanistan and surrounds for thousands of years as coursing hounds",
    funFact: "Afghan Hounds were the first animals successfully cloned — Snuppy, a male Afghan, was cloned in South Korea in 2005",
    popCulture: "Pablo Picasso's Afghan Hound Kabul appears in several paintings; Barbie's first dog was an Afghan Hound named Beauty",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Afghan Hounds have a unique hip joint structure that gives them near-acrobatic agility — they can rotate their hips to navigate steep mountain terrain at full speed",
  },
  {
    id: "irish-wolfhound", name: "Irish Wolfhound",
    description: "The tallest dog breed! Irish Wolfhounds were bred to hunt wolves and elk. Despite their size, they're gentle, patient, and thoughtful.",
    origin: "Ireland", size: "giant" as const, temperament: "Patient, Thoughtful, Generous", lifespan: "6-8 years", imageUrl: IMGS.great_dane, group: "Hound", rarity: "rare" as const,
    personality: "Ancient philosopher king, loves completely",
    humanJob: "Law professor, poet, rugby coach",
    coffeeOrder: "Irish breakfast tea, black",
    ancestors: "Celtic hounds bred for war and hunting since before Roman times; Julius Caesar wrote about them; used to hunt Irish wolves until the wolves went extinct",
    funFact: "Irish Wolfhounds were so prized in ancient Ireland that only kings and nobles were permitted to own them — and a king could own as many as his province could count",
    popCulture: "Finn MacCool's legendary hound Bran; Gelert in the Welsh legend of Llywelyn; the mascot of the Irish Guards Regiment",
    energyLevel: 3, apartmentFriendly: 2, chaosLevel: 2,
    randomLore: "Irish Wolfhounds were so effective at hunting that they eliminated every wolf from Ireland by the 17th century — then nearly went extinct themselves as their purpose disappeared",
  },
  {
    id: "mastiff", name: "Mastiff",
    description: "An ancient breed! Mastiffs are among the heaviest dogs in the world, yet they're gentle and patient. Caesar wrote about them in 55 BC.",
    origin: "England", size: "giant" as const, temperament: "Good-Natured, Courageous, Dignified", lifespan: "6-10 years", imageUrl: IMGS.bulldog, group: "Working", rarity: "rare" as const,
    personality: "Ancient, dignified, immovably calm",
    humanJob: "Museum curator, knows every piece",
    coffeeOrder: "Whatever requires least fuss",
    ancestors: "Ancient Molossian dogs of the Middle East and Mediterranean, arriving in England via Phoenician traders before the Romans",
    funFact: "The heaviest dog ever recorded was a Mastiff named Zorba who weighed 343 pounds in 1989 and measured 8 feet 3 inches from nose to tail",
    popCulture: "Medieval English knights kept Mastiffs in armor for battle; Kublai Khan owned 5,000 Mastiffs; Caesar wrote of their ferocity in battle",
    energyLevel: 2, apartmentFriendly: 2, chaosLevel: 1,
    randomLore: "An English Mastiff named Lenda crossed the Atlantic with the Mayflower in 1620 — making her possibly the first dog to arrive in Plymouth Colony",
  },
  {
    id: "lagotto-romagnolo", name: "Lagotto Romagnolo",
    description: "Italy's truffle dog! Lagottos are used to hunt the world's most expensive food — truffles. Their curly coat is waterproof and low-shedding.",
    origin: "Italy", size: "medium" as const, temperament: "Loving, Active, Keen", lifespan: "15-17 years", imageUrl: IMGS.poodle, group: "Sporting", rarity: "rare" as const,
    personality: "Passionately dedicated, very specific task",
    humanJob: "Master sommelier, identifies blindfolded",
    coffeeOrder: "Italian espresso with truffle chocolate",
    ancestors: "Ancient water retrievers of the Romagna marshes of Italy, retrained for truffle hunting when the marshes were drained in the 1800s",
    funFact: "Lagottos can smell truffles buried up to 3 feet underground — a truffle-hunting Lagotto earns its Italian owner tens of thousands of dollars per season",
    popCulture: "The only AKC-recognized breed used specifically for truffle hunting; prized across Italy and increasingly France and the Pacific Northwest",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "When the Romagna marshes were drained in the 19th century, waterfowl hunters retrained their Lagottos to hunt truffles — accidentally creating one of the most economically valuable dog jobs in history",
  },
  {
    id: "alaskan-klee-kai", name: "Alaskan Klee Kai",
    description: "A miniature Husky look-alike! Alaskan Klee Kais are intelligent, curious, and highly active. They're rare and relatively new breeds.",
    origin: "United States", size: "small" as const, temperament: "Intelligent, Curious, Active", lifespan: "13-16 years", imageUrl: IMGS.husky, group: "Non-Sporting", rarity: "rare" as const,
    personality: "Husky intensity, apartment-sized, still escapes",
    humanJob: "Startup founder, never fully powers down",
    coffeeOrder: "Small but extremely strong espresso",
    ancestors: "Created in the 1970s by Linda Spurlin of Alaska who wanted a companion-sized version of the Siberian Husky, using Siberian and Alaskan Huskies with American Eskimo Dogs",
    funFact: "Alaskan Klee Kai means 'small dog' in an Athabascan dialect — the breed is so rare that only about 14,000 exist worldwide",
    popCulture: "Rarely seen on screen due to rarity; gaining social media fame as the 'miniature wolf-dog' for their stunning appearance",
    energyLevel: 4, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "The Alaskan Klee Kai is one of the newest recognized breeds — developed privately by Linda Spurlin for 17 years before the AKC even knew it existed",
  },
  {
    id: "catahoula-leopard-dog", name: "Catahoula Leopard Dog",
    description: "Louisiana's state dog! Catahoulas have merle coats, multi-colored eyes, and webbed feet. They were used to hunt wild boar.",
    origin: "United States", size: "large" as const, temperament: "Energetic, Inquisitive, Assertive", lifespan: "10-14 years", imageUrl: IMGS.aussie, group: "Herding", rarity: "rare" as const,
    personality: "Wild, beautiful, entirely own creature",
    humanJob: "Bayou guide, knows every waterway",
    coffeeOrder: "Chicory coffee, Louisiana style",
    ancestors: "Descendants of Native American dogs crossed with Spanish war dogs brought to Louisiana by Hernando de Soto in 1539",
    funFact: "Catahoulas are the only breed that climbs trees — they were trained to chase wild boar and tree them using their webbed feet",
    popCulture: "Louisiana's official state dog since 1979; named after Catahoula Lake in Louisiana; popular among Southern hog hunters",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 4,
    randomLore: "Catahoulas were developed by Native Americans who bred their dogs with Spanish war dogs — making them one of the only breeds with documented pre-Columbian American heritage",
  },
  {
    id: "korean-jindo", name: "Korean Jindo",
    description: "A Korean national treasure! Jindos are fiercely loyal and are known for finding their way home from great distances. They're catlike in their cleanliness.",
    origin: "South Korea", size: "medium" as const, temperament: "Loyal, Alert, Brave", lifespan: "14-15 years", imageUrl: IMGS.shiba, group: "Non-Sporting", rarity: "rare" as const,
    personality: "Fiercely independent, impossibly loyal always",
    humanJob: "Mountain tracker, never lost a target",
    coffeeOrder: "Korean barley tea",
    ancestors: "Developed in isolation on Jindo Island, South Korea over several thousand years — one of the world's truly indigenous breeds",
    funFact: "A Jindo named Baekgu found her way home from a city 180 miles away, seven months after being sold — trekking across mountains to return to her original owner",
    popCulture: "South Korea's Natural Monument No. 53; protected by law from export; featured prominently in Korean culture and folklore",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Exporting a Korean Jindo from South Korea requires government permission — they are a legally protected national treasure",
  },
  {
    id: "treeing-walker-coonhound", name: "Treeing Walker Coonhound",
    description: "Built to chase raccoons up trees! Treeing Walker Coonhounds are speedy, smart, and confident with a musical hound voice.",
    origin: "United States", size: "large" as const, temperament: "Clever, Confident, Courageous", lifespan: "12-13 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "rare" as const,
    personality: "Fearless, musical, laser-focused on scent",
    humanJob: "Jazz musician and wilderness tracker",
    coffeeOrder: "Strong percolator, 3am hunt",
    ancestors: "Developed in Virginia from Thomas Walker's English Foxhounds and a stolen dog called 'Tennessee Lead' whose origins remain mysterious",
    funFact: "Treeing Walker Coonhounds can climb low tree limbs if needed and are among the fastest of all coonhound breeds",
    popCulture: "Stars of Billy's pack in the novel 'Where the Red Fern Grows' — the most famous literary coon dogs in American culture",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "The breed's secret ingredient, 'Tennessee Lead,' was a stolen dog of completely unknown origin — his extraordinary hunting ability transformed the Walker Coonhound into what it is today",
  },
  {
    id: "american-foxhound", name: "American Foxhound",
    description: "America's original scent hound! George Washington helped develop this breed for fox hunting. They have a musical howl and unlimited stamina.",
    origin: "United States", size: "large" as const, temperament: "Kind, Loyal, Sweet-Tempered", lifespan: "11-13 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "rare" as const,
    personality: "Sweet, musical, built for long hauls",
    humanJob: "Park ranger who sings every trail",
    coffeeOrder: "Classic American diner drip coffee",
    ancestors: "English Foxhounds crossed with French hounds given by Lafayette to George Washington, refined in the American colonies",
    funFact: "George Washington was a dedicated foxhound breeder who kept detailed stud records — he was effectively America's first serious dog breeder",
    popCulture: "America's oldest recognized breed; Virginia's state dog; featured in colonial American art alongside George Washington on horseback",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "George Washington meticulously recorded his foxhound breeding in his diary — including notes on individual dogs' performances, a record that still survives at Mount Vernon",
  },
  {
    id: "pharaoh-hound", name: "Pharaoh Hound",
    description: "The blushing dog! Pharaoh Hounds blush pink on their nose and ears when excited. These ancient dogs were probably brought to Malta by Phoenician traders.",
    origin: "Malta", size: "medium" as const, temperament: "Friendly, Intelligent, Trainable", lifespan: "11-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "rare" as const,
    personality: "Elegant and ancient, glows pink happily",
    humanJob: "Diplomat, blush is greatest feature",
    coffeeOrder: "Herbal tea in beautiful glass cup",
    ancestors: "Possibly descended from the ancient Tesem dogs depicted in Egyptian carvings 5,000 years ago, brought to Malta by Phoenician traders",
    funFact: "Pharaoh Hounds are one of two dog breeds that blush — their nose and ears turn rose-pink when they're happy or excited",
    popCulture: "Malta's national dog; depicted on Maltese lira currency; the AKC was so impressed by the blushing ability they featured it in official breed descriptions",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "The Pharaoh Hound is Malta's national dog — the Maltese name Kelb tal-Fenek ('rabbit dog') reflects their true purpose: hunting rabbits in the rocky Maltese terrain",
  },
  {
    id: "ibizan-hound", name: "Ibizan Hound",
    description: "A natural athlete! Ibizan Hounds can jump 5 feet from a standstill. They were used to hunt rabbits on the Spanish Balearic islands for centuries.",
    origin: "Spain", size: "large" as const, temperament: "Clownish, Warm, Engaging", lifespan: "11-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "rare" as const,
    personality: "Clownish acrobat, Greek statue physique",
    humanJob: "Parkour athlete, gymnastics coach",
    coffeeOrder: "Strong café con leche",
    ancestors: "Descended from ancient Egyptian and Phoenician hounds brought to the Balearic Islands over 3,000 years ago; developed in relative isolation on Ibiza",
    funFact: "Ibizan Hounds can leap 5 feet vertically from a standstill — they hunt by sight, sound, AND scent, a rare triple combination",
    popCulture: "Depicted in ancient Egyptian art resembling Anubis; their striking appearance has made them art-world favorites and high-fashion subjects",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Ibizans hunt in a unique pack style — the hunter uses a 'podenquer' ferret to flush rabbits while a group of Ibizans surrounds the area, leaping and working in complete coordination",
  },
  {
    id: "xoloitzcuintli", name: "Xoloitzcuintli",
    description: "One of the world's oldest breeds! The hairless Xolo was worshipped by Aztecs and believed to guide the dead to the underworld. Still rare today.",
    origin: "Mexico", size: "medium" as const, temperament: "Loyal, Alert, Calm", lifespan: "13-18 years", imageUrl: IMGS.generic3, group: "Non-Sporting", rarity: "rare" as const,
    personality: "Ancient, serene, otherworldly knowledge",
    humanJob: "Archaeologist at home in Aztec ruins",
    coffeeOrder: "Ceremonial cacao, ancient Mesoamerican style",
    ancestors: "One of the oldest and rarest breeds, present in the Americas for over 3,000 years; worshipped by Aztecs, Toltecs, and Maya",
    funFact: "The Xolo's warm, hairless body was used medicinally by Aztecs — sleeping with a Xolo was believed to cure rheumatism and insomnia",
    popCulture: "Featured in Pixar's 'Coco' as Dante, a Xolo who guides the protagonist through the Land of the Dead — perfectly accurate to Aztec mythology",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Aztecs believed Xolos were created by the god Xolotl to guide the dead safely through the underworld to Mictlan — they were buried with their owners to serve as guides in the afterlife",
  },
  {
    id: "peruvian-inca-orchid", name: "Peruvian Inca Orchid",
    description: "Peru's national dog! Mostly hairless with spotted skin, these dogs ran with the Inca and were kept as warmth-providers and bed warmers.",
    origin: "Peru", size: "medium" as const, temperament: "Loyal, Friendly, Alert", lifespan: "11-12 years", imageUrl: IMGS.generic3, group: "Non-Sporting", rarity: "rare" as const,
    personality: "Ancient, sun-warmed, deeply attached",
    humanJob: "Peruvian textile artist, ancient techniques",
    coffeeOrder: "Peruvian single-origin pour-over",
    ancestors: "Depicted in pre-Incan Moche culture pottery dating back to 750 AD; kept as bed-warmers and companions by Incan nobles",
    funFact: "Peruvian Inca Orchids can have hair or be hairless — even within the same litter, and sometimes have spots on their bare skin",
    popCulture: "Peru's national dog; used in ceremonies at Machu Picchu for tourists; featured in the opening of the 2019 Pan American Games in Lima",
    energyLevel: 3, apartmentFriendly: 4, chaosLevel: 2,
    randomLore: "Spanish conquistadors reported seeing thousands of these dogs at Incan noble courts, kept warm in special rooms — they were a mark of royal status",
  },
  {
    id: "american-hairless-terrier", name: "American Hairless Terrier",
    description: "America's only hairless breed! Developed from a rare mutation in Rat Terriers, they're playful, intelligent, and hypoallergenic.",
    origin: "United States", size: "small" as const, temperament: "Energetic, Inquisitive, Alert", lifespan: "14-16 years", imageUrl: IMGS.generic3, group: "Terrier", rarity: "rare" as const,
    personality: "Fierce terrier spirit, completely unarmored",
    humanJob: "Garage startup founder, always wins",
    coffeeOrder: "Surprisingly hot espresso",
    ancestors: "Descended from a single hairless Rat Terrier puppy named Josephine, born in 1972 in Louisiana — the entire breed traces to her",
    funFact: "Unlike other hairless breeds, American Hairless Terriers are born with a fine coat that falls out in the first weeks — they can also sunburn",
    popCulture: "The only AKC-recognized breed developed entirely by accident in Louisiana; their unique origin story made national news in the 1970s",
    energyLevel: 4, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "The entire American Hairless Terrier breed descends from a single hairless puppy named Josephine — Edwin Scott selectively bred her line for 12 years to establish the new breed",
  },
  {
    id: "canaan-dog", name: "Canaan Dog",
    description: "Israel's national dog and one of the world's oldest breeds! Canaan Dogs survived for centuries in the desert using their natural instincts.",
    origin: "Israel", size: "medium" as const, temperament: "Alert, Vigilant, Devoted", lifespan: "12-15 years", imageUrl: IMGS.shiba, group: "Herding", rarity: "rare" as const,
    personality: "Ancient, self-sufficient, trusts very few",
    humanJob: "Intelligence analyst, never caught off-guard",
    coffeeOrder: "Strong Turkish coffee",
    ancestors: "The ancient pariah dogs of the Levant, possibly the oldest dogs in the Middle East — depicted in Sinai rock carvings from 4,000 years ago",
    funFact: "Canaan Dogs lived feral in the Negev Desert for 2,000 years after the Jewish diaspora — Rudolphina Menzel domesticated the feral dogs she found there starting in 1934",
    popCulture: "Israel's national dog; trained by the Israeli Defense Forces for mine detection, search and rescue, and tracking",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 3,
    randomLore: "Canaan Dogs survived thousands of years of feral life in the desert by developing extreme alertness, self-sufficiency, and a distrust of strangers — traits that make them extraordinary military dogs",
  },

  // Legendary (10 breeds)
  {
    id: "basenji", name: "Basenji",
    description: "The barkless dog from Africa! Basenjis yodel instead of bark and are fastidiously clean — they groom themselves like cats.",
    origin: "Central Africa", size: "small" as const, temperament: "Independent, Smart, Poised", lifespan: "13-14 years", imageUrl: IMGS.shiba, group: "Hound", rarity: "legendary" as const,
    personality: "Ancient, catlike, intensely intelligent",
    humanJob: "Renowned linguist, never wastes a word",
    coffeeOrder: "Single-origin African pour-over",
    ancestors: "One of the world's oldest breeds, depicted in Egyptian tomb paintings 5,000 years ago; central African tribes used them for hunting in the Congo",
    funFact: "Basenjis produce a unique sound called a 'baroo' or yodel instead of barking — due to their unusually shaped larynx",
    popCulture: "Featured in the novel and film 'Good-bye, My Lady'; the breed that proved that not all dogs bark was mind-bending to early dog scientists",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 4,
    randomLore: "Basenjis are the only dog breed that goes into heat once a year like wolves — rather than twice a year like modern domestic dogs — a preserved primitive trait",
  },
  {
    id: "saluki", name: "Saluki",
    description: "One of the oldest dog breeds! Ancient pharaohs kept Salukis for hunting. They're elegant, fast, and deeply devoted to one person.",
    origin: "Middle East", size: "medium" as const, temperament: "Gentle, Dignified, Independent", lifespan: "12-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "legendary" as const,
    personality: "Oldest aristocrat, devoted to one person",
    humanJob: "Desert archaeologist, Silk Road walker",
    coffeeOrder: "Cardamom Arab coffee, original coffee culture",
    ancestors: "One of the oldest identifiable breeds, depicted on Egyptian tomb carvings 5,000 years ago; the sacred dog of Arab tribes across the Fertile Crescent",
    funFact: "Salukis were considered so sacred that Arab tribesmen called them 'el hor' — the noble one — and they were allowed to sleep inside tents with the family",
    popCulture: "Saluki remains were found in King Tutankhamun's tomb; Alexander the Great is said to have kept Salukis; the breed has a 5,000-year documented history",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Salukis were mummified and entombed with pharaohs — their preserved remains have been found in Egyptian tombs dating to 2,000 BC",
  },
  {
    id: "tibetan-mastiff", name: "Tibetan Mastiff",
    description: "An ancient guardian of the Himalayas! Tibetan Mastiffs are massive, bear-like dogs that were sold for millions in China as status symbols.",
    origin: "Tibet", size: "giant" as const, temperament: "Tenacious, Strong-Willed, Intelligent", lifespan: "10-12 years", imageUrl: IMGS.chow, group: "Working", rarity: "legendary" as const,
    personality: "Ancient mountain guardian, no instructions needed",
    humanJob: "Supreme Court justice, born authority",
    coffeeOrder: "Yak butter tea",
    ancestors: "One of the oldest large breeds, used for millennia by Tibetan nomads and Buddhist monasteries as the ultimate guardian dog",
    funFact: "A Tibetan Mastiff sold for $1.9 million in China in 2014 — a real estate developer bought it believing it contained lion's blood",
    popCulture: "Marco Polo described Tibetan Mastiffs as 'tall as a donkey'; Chinese billionaires sparked a 2010s status-dog craze that briefly made them the most expensive dogs on earth",
    energyLevel: 2, apartmentFriendly: 1, chaosLevel: 2,
    randomLore: "At the peak of China's Tibetan Mastiff craze in 2013, a single puppy was sold for 12 million yuan — the breeder arrived with the dog in a motorcade of gold-colored Mercedes to deliver it",
  },
  {
    id: "azawakh", name: "Azawakh",
    description: "A West African sighthound of breathtaking elegance. Azawakhs are extremely rare outside Africa and bond intensely with one family.",
    origin: "West Africa", size: "medium" as const, temperament: "Affectionate, Rugged, Attentive", lifespan: "12-15 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "legendary" as const,
    personality: "Sculptural, aloof, fiercely loyal within",
    humanJob: "Rare manuscript conservator, priceless work",
    coffeeOrder: "Nomadic Tuareg tea, three glasses",
    ancestors: "Bred for centuries by the Tuareg and other nomadic tribes of the Sahel region of West Africa as guardians and coursing hounds",
    funFact: "Azawakhs run at over 40 mph but are distinct from other sighthounds in that they hunt in packs and guard camps — not just coursing solo",
    popCulture: "Virtually unknown outside their homeland until French army officers brought them to Europe in the 1970s; still extremely rare outside Africa and specialized breeding circles",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Tuareg nomads consider the Azawakh part of the family — the dogs are allowed inside tents and share food with the family, a rare honor in nomadic culture",
  },
  {
    id: "thai-ridgeback", name: "Thai Ridgeback",
    description: "One of only three ridgeback breeds! Thai Ridgebacks were isolated in Thailand for centuries and retain primitive instincts. Extremely rare outside Asia.",
    origin: "Thailand", size: "medium" as const, temperament: "Independent, Athletic, Loyal", lifespan: "12-13 years", imageUrl: IMGS.akita, group: "Hound", rarity: "legendary" as const,
    personality: "Primitive, watchful, utterly independent",
    humanJob: "Muay Thai instructor, 30 years, extraordinary",
    coffeeOrder: "Thai iced coffee, strong and sweet",
    ancestors: "One of three ridgeback breeds and one of the oldest primitive breeds, isolated on the islands of eastern Thailand for thousands of years",
    funFact: "Thai Ridgebacks have 8 different ridge patterns on their backs — more variety than any other ridgeback breed",
    popCulture: "Depicted in ancient Thai murals and manuscripts; rarely seen outside Thailand; gaining recognition as breeders bring them to international shows",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 3,
    randomLore: "Thai Ridgebacks were so isolated geographically that they developed independently of all other ridgeback breeds — the ridge appears to be a convergent evolutionary feature, not shared ancestry",
  },
  {
    id: "cirneco-dell-etna", name: "Cirneco dell'Etna",
    description: "Sicily's rabbit hunter! This ancient breed lived in the shadow of Mount Etna for 3,000 years. Lean, athletic, and effortlessly elegant.",
    origin: "Sicily, Italy", size: "medium" as const, temperament: "Independent, Gentle, Athletic", lifespan: "12-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "legendary" as const,
    personality: "Quietly extraordinary, volcanic island survivor",
    humanJob: "Archaeologist in ancient Sicily, lava fields",
    coffeeOrder: "Sicilian almond granita with espresso",
    ancestors: "Descended from Pharaoh Hound-type dogs brought to Sicily by Phoenician traders over 3,000 years ago; adapted to the harsh volcanic slopes of Etna",
    funFact: "Cirneco dell'Etna coins were minted in ancient Sicily — the breed is depicted on coins from Syracuse dating to 500 BC",
    popCulture: "Ancient Sicilian coins from 500 BC depict this breed; one of the rarest breeds in the world with fewer than 200 in the U.S.",
    energyLevel: 4, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "The Cirneco survived 3,000 years of Sicilian isolation unchanged — volcanic eruptions, invading empires, and the passage of three millennia left this breed essentially unaltered",
  },
  {
    id: "portuguese-podengo-pequeno", name: "Portuguese Podengo Pequeno",
    description: "Portugal's smallest rabbit hunter! Ancient, lively, and agile, the Podengo has changed little since Phoenician traders brought them to Portugal.",
    origin: "Portugal", size: "small" as const, temperament: "Lively, Alert, Playful", lifespan: "10-15 years", imageUrl: IMGS.generic7, group: "Hound", rarity: "legendary" as const,
    personality: "Ancient, lively, unchanged by 3,000 years",
    humanJob: "Antique dealer, seven centuries, never overpays",
    coffeeOrder: "Bica — tiny intense Portuguese espresso",
    ancestors: "Among the oldest breeds in the Iberian Peninsula, brought by Phoenician traders around 1000 BC; considered a living archaeological artifact",
    funFact: "Portuguese Podengos come in three sizes (small, medium, large) and two coat types — there are effectively six varieties of the same ancient breed",
    popCulture: "Hanno, a Portuguese Podengo Pequeno, starred in the 2012 Westminster Dog Show Best in Show — the first of the breed to win",
    energyLevel: 4, apartmentFriendly: 4, chaosLevel: 3,
    randomLore: "Portuguese Podengo Pequenos may have sailed with Portuguese explorers in the Age of Discovery — small enough to keep as ship ratters, fierce enough to survive the voyage",
  },
  {
    id: "carolina-dog", name: "Carolina Dog",
    description: "America's wild dog! Carolina Dogs, also called American Dingoes, were feral dogs living along the Southeast US for thousands of years. A living fossil!",
    origin: "United States", size: "medium" as const, temperament: "Primitive, Loyal, Resourceful", lifespan: "12-15 years", imageUrl: IMGS.generic6, group: "Hound", rarity: "legendary" as const,
    personality: "Primal, self-reliant, notices everything",
    humanJob: "Wilderness survivalist, crossed Appalachians unaided",
    coffeeOrder: "Whatever they can forage",
    ancestors: "Descended from the first dogs to cross the Bering land bridge with paleo-Indians into the Americas 14,000 years ago — among the oldest dogs in the Western Hemisphere",
    funFact: "Carolina Dogs were only discovered as a distinct breed in the 1970s — they had been living wild in the swamps of Georgia and South Carolina undetected",
    popCulture: "Called 'American Dingoes' for their similarity to Australian Dingoes — both descended from ancient pariah dogs brought by early human migrations",
    energyLevel: 3, apartmentFriendly: 3, chaosLevel: 2,
    randomLore: "Carolina Dogs share genetic markers with ancient Asian dogs brought across the Bering land bridge — they are a living genetic link to the original dogs that came to the Americas with the first humans",
  },
  {
    id: "lagotto-truffle-hunter", name: "Otterhound",
    description: "Critically endangered! Fewer than 1,000 Otterhounds exist worldwide. This shaggy, web-footed breed was bred exclusively to hunt otters.",
    origin: "England", size: "large" as const, temperament: "Amiable, Boisterous, Jovial", lifespan: "10-13 years", imageUrl: IMGS.generic1, group: "Hound", rarity: "legendary" as const,
    personality: "Boisterous shaggy eccentric, specific enthusiasms",
    humanJob: "Conservation biologist who saved forgotten ecosystem",
    coffeeOrder: "Large messy drink, knocked over accidentally",
    ancestors: "Bred from Bloodhounds, Rough Terriers, and French Vendée Hounds to follow otter scent trails through rivers in medieval England",
    funFact: "Otterhounds have webbed feet and a double coat that traps air for buoyancy — they were built specifically to swim rivers for hours without tiring",
    popCulture: "When otter hunting was banned in the UK in 1978, the Otterhound's purpose vanished overnight — the breed's population began a sharp and continuing decline",
    energyLevel: 4, apartmentFriendly: 2, chaosLevel: 3,
    randomLore: "Fewer Otterhounds exist today than Giant Pandas — with roughly 600 worldwide, they are one of the most critically endangered dog breeds on earth",
  },
  {
    id: "mudi", name: "Mudi",
    description: "Hungary's rarest dog! The Mudi is a versatile farm dog that can herd sheep, hunt boars, and even rescue avalanche victims. Nearly wiped out in WWII.",
    origin: "Hungary", size: "medium" as const, temperament: "Versatile, Intelligent, Active", lifespan: "12-14 years", imageUrl: IMGS.aussie, group: "Herding", rarity: "legendary" as const,
    personality: "Versatile and quietly extraordinary",
    humanJob: "Morning shepherd, evening violinist",
    coffeeOrder: "Hungarian unicum, not for everyone",
    ancestors: "A naturally developed Hungarian herding dog discovered in the late 1800s — possibly the result of natural crosses between ancient Spitz and herding breeds in Hungary",
    funFact: "Mudis have been used as avalanche rescue dogs, drug detection dogs, and herding dogs simultaneously — there is almost nothing they cannot learn",
    popCulture: "Featured in Finnish search-and-rescue competitions where they regularly outperform breeds ten times their popularity; gaining visibility through agility and sport dog communities",
    energyLevel: 5, apartmentFriendly: 2, chaosLevel: 4,
    randomLore: "After WWII, only a handful of Mudis could be found in Hungary — Dr. Dezso Fenyes had documented the breed in 1936, and his records became the blueprint for rebuilding the population from near-extinction",
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

/* ── Daily Dog — once-per-day guaranteed free breed ───────────── */

function startOfDayUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

router.post("/dogs/daily", async (req, res) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: "unauthorized", message: "Sign in required" });
  }

  try {
    const userRows = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
    const user = userRows[0];

    const now = new Date();
    const todayStart = startOfDayUTC(now);
    const nextReset = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    if (user?.dailyDogAt && new Date(user.dailyDogAt) >= todayStart) {
      return res.status(429).json({
        error: "daily_limit",
        message: "Daily Dog already claimed today",
        nextReset: nextReset.toISOString(),
      });
    }

    // Accept optional list of already-collected breedIds from client
    const collectedIds: string[] = Array.isArray(req.body?.collectedIds)
      ? req.body.collectedIds.filter((s: unknown) => typeof s === "string")
      : [];

    // Pick random uncollected breed if possible, otherwise any random
    const available = DOG_BREEDS.filter((b) => !collectedIds.includes(b.id));
    const pool = available.length > 0 ? available : DOG_BREEDS;
    const breed = pool[Math.floor(Math.random() * pool.length)];

    const xpDelta = XP_PER_RARITY[breed.rarity] ?? 10;

    if (user) {
      await db
        .update(usersTable)
        .set({
          collectionCount: sql`${usersTable.collectionCount} + 1`,
          xp: sql`${usersTable.xp} + ${xpDelta}`,
          dailyDogAt: now,
          updatedAt: now,
        })
        .where(eq(usersTable.clerkId, clerkId));
    }

    req.log?.info({ clerkId, breedId: breed.id }, "Daily Dog claimed");

    return res.json({
      breedId: breed.id,
      breedName: breed.name,
      confidence: 1,
      description: breed.description,
      isDog: true,
      source: "daily",
      rarity: breed.rarity,
      imageUrl: breed.imageUrl,
      nextReset: nextReset.toISOString(),
    });
  } catch (err) {
    req.log?.error({ err }, "Daily Dog failed");
    return res.status(500).json({ error: "db_error", message: "Failed to claim Daily Dog" });
  }
});

/* ── POST /dogs/detect — image-based breed detection ───────────── */

router.post("/dogs/detect", async (req, res) => {
  let { imageBase64, mimeType = "image/jpeg" } = req.body as {
    imageBase64: string;
    mimeType?: string;
  };

  if (!imageBase64) {
    return res.status(400).json({ error: "bad_request", message: "imageBase64 is required" });
  }

  // Strip data-URL prefix if the client included it (common on web)
  if (imageBase64.includes(",")) {
    const parts = imageBase64.split(",");
    const header = parts[0]; // e.g. "data:image/jpeg;base64"
    imageBase64 = parts[1];
    const match = header.match(/data:([^;]+);/);
    if (match) mimeType = match[1];
  }

  // Convert any image format (HEIC, WebP, PNG, TIFF, etc.) to JPEG using sharp.
  let jpegBase64 = imageBase64;
  const inputBuffer = Buffer.from(imageBase64, "base64");
  try {
    const jpegBuffer = await sharp(inputBuffer)
      .rotate()           // respect EXIF orientation
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    jpegBase64 = jpegBuffer.toString("base64");
    req.log?.info({ inputBytes: inputBuffer.length, outputBytes: jpegBuffer.length }, "sharp conversion OK");
  } catch (sharpErr) {
    req.log?.warn({ sharpErr }, "sharp conversion failed — trying heic-convert fallback");
    // HEIC files have "ftyp" at byte offset 4. sharp/libvips hits a security limit on
    // complex HEIC (many iref entries). heic-convert uses a separate WASM libheif build
    // that handles these files.
    const magic = inputBuffer.slice(4, 8).toString("ascii");
    if (magic === "ftyp") {
      try {
        const { default: heicConvert } = await import("heic-convert");
        const outputBuffer = await heicConvert({
          buffer: inputBuffer,
          format: "JPEG",
          quality: 0.88,
        });
        jpegBase64 = (outputBuffer as Buffer).toString("base64");
        req.log?.info({ outputBytes: jpegBase64.length }, "heic-convert conversion OK");
      } catch (heicErr) {
        req.log?.error({ heicErr }, "heic-convert also failed");
        return res.status(422).json({
          error: "heic_conversion_failed",
          message: "Could not convert this HEIC photo. Please try again with a JPEG or PNG.",
        });
      }
    }
    // Non-HEIC formats: pass through and let OpenAI give the clearest error.
  }

  // ============================================================
  // Stage 1: Try on-device TFLite model first (fast, no API cost)
  // ============================================================
  let tfliteResult: TFLiteResult | null = null;
  try {
    tfliteResult = await runTFLiteInference(jpegBase64);
    req.log?.info({
      tfliteConfidence: tfliteResult?.top1.confidence ?? null,
      tfliteBreedId: tfliteResult?.top1.dogdex_id ?? null,
      tfliteIsDog: tfliteResult?.is_dog ?? null,
    }, "TFLite inference result");
  } catch (tfliteErr) {
    req.log?.warn({ tfliteErr }, "TFLite inference threw — will fallback to GPT");
  }

  // If TFLite is confident and maps to a DogDex breed, return immediately
  if (
    tfliteResult &&
    tfliteResult.is_dog &&
    tfliteResult.top1.confidence >= TFLITE_CONFIDENCE_THRESHOLD &&
    tfliteResult.top1.dogdex_id
  ) {
    const breed = DOG_BREEDS.find((b) => b.id === tfliteResult!.top1.dogdex_id);
    if (breed) {
      return res.json({
        isDog: true,
        breedId: breed.id,
        breedName: breed.name,
        confidence: tfliteResult.top1.confidence,
        description: breed.description,
        source: "tflite",
      });
    }
  }

  // ============================================================
  // Stage 2: Fallback to GPT-5 vision (handles edge cases, new breeds, ambiguous photos)
  // ============================================================
  const useFallback =
    !tfliteResult ||
    !tfliteResult.is_dog ||
    tfliteResult.top1.confidence < TFLITE_CONFIDENCE_THRESHOLD ||
    !tfliteResult.top1.dogdex_id;

  req.log?.info({ useFallback }, "GPT-5 fallback decision");

  if (useFallback) {
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
                  url: `data:image/jpeg;base64,${jpegBase64}`,
                  detail: "low",
                },
              },
              {
                type: "text",
                text: `You are a dog breed expert. Analyze this image and respond with JSON only (no markdown).

If there is NO dog in the image, respond with exactly:
{"isDog": false, "breedName": "", "confidence": 0, "description": "No dog detected in this image."}

If there IS a dog, identify its breed and respond with:
{"isDog": true, "breedName": "<breed name>", "confidence": <0.0-1.0>, "description": "<one fun sentence about this breed>"}

Be specific with breed names. For mixed breeds, list the most likely breeds. Confidence should reflect how certain you are.`,
              },
            ],
          },
        ],
      });

      const msg = response.choices[0]?.message;
      const refusal = (msg as { refusal?: string | null })?.refusal;
      let content = msg?.content ?? "";
      req.log?.info({ content, refusal: refusal ?? null }, "OpenAI response");

      if (refusal || !content.trim()) {
        return res.json({
          isDog: false,
          breedId: "",
          breedName: "",
          confidence: 0,
          description: "No dog detected in this image.",
        });
      }

      content = content.trim();
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }

      let parsed: {
        isDog: boolean;
        breedName: string;
        confidence: number;
        description: string;
      };

      try {
        parsed = JSON.parse(content);
      } catch {
        req.log?.warn({ content }, "JSON parse failed — treating as no dog");
        return res.json({
          isDog: false,
          breedId: "",
          breedName: "",
          confidence: 0,
          description: "Couldn't read the AI response. Please try again.",
        });
      }

      if (!parsed.isDog) {
        return res.json({
          isDog: false,
          breedId: "",
          breedName: "",
          confidence: 0,
          description: parsed.description ?? "No dog detected.",
        });
      }

      const detectedName = parsed.breedName.toLowerCase();
      const matched = DOG_BREEDS.find((b) => {
        return (
          b.name.toLowerCase() === detectedName ||
          b.name.toLowerCase().includes(detectedName) ||
          detectedName.includes(b.name.toLowerCase()) ||
          b.id.replace(/-/g, " ") === detectedName
        );
      });

      return res.json({
        isDog: true,
        breedId: matched?.id ?? "",
        breedName: parsed.breedName,
        confidence: parsed.confidence,
        description: parsed.description,
        source: "gpt",
      });
    } catch (err) {
      req.log?.error({ err }, "OpenAI API error");
      return res.status(500).json({
        error: "ai_error",
        message: "Failed to analyze image",
      });
    }
  }

  // TFLite said no dog, and no fallback wanted — return no dog
  return res.json({
    isDog: false,
    breedId: "",
    breedName: "",
    confidence: 0,
    description: "No dog detected in this image.",
  });
});

export default router;
