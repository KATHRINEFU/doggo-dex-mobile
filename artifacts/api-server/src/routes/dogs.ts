import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

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
  { id: "labrador-retriever", name: "Labrador Retriever", description: "America's most popular dog! Labs are friendly, outgoing, and great with families. They love swimming and fetching.", origin: "Canada", size: "large" as const, temperament: "Friendly, Active, Outgoing", lifespan: "10-12 years", imageUrl: IMGS.lab, group: "Sporting", rarity: "common" as const },
  { id: "french-bulldog", name: "French Bulldog", description: "Bat-eared charmers who are playful and adaptable. Frenchies are excellent city dogs who love lounging with their humans.", origin: "France", size: "small" as const, temperament: "Adaptable, Playful, Smart", lifespan: "10-12 years", imageUrl: IMGS.frenchie, group: "Non-Sporting", rarity: "common" as const },
  { id: "golden-retriever", name: "Golden Retriever", description: "Joyful, devoted, and friendly! Goldens are trustworthy family dogs with a love for outdoor adventures and water.", origin: "Scotland", size: "large" as const, temperament: "Friendly, Reliable, Trustworthy", lifespan: "10-12 years", imageUrl: IMGS.golden, group: "Sporting", rarity: "common" as const },
  { id: "german-shepherd", name: "German Shepherd", description: "Confident, courageous, and smart! GSDs are incredibly versatile working dogs used in police and military roles worldwide.", origin: "Germany", size: "large" as const, temperament: "Confident, Courageous, Smart", lifespan: "7-10 years", imageUrl: IMGS.gsd, group: "Herding", rarity: "common" as const },
  { id: "poodle", name: "Poodle", description: "One of the smartest breeds! Poodles are elegant, proud, and very clever — they excel at dog sports and love to learn.", origin: "Germany", size: "medium" as const, temperament: "Intelligent, Active, Alert", lifespan: "10-18 years", imageUrl: IMGS.poodle, group: "Non-Sporting", rarity: "common" as const },
  { id: "bulldog", name: "Bulldog", description: "Wrinkly, lovable, and surprisingly gentle. Bulldogs are calm and courageous, making them fantastic companions for apartment living.", origin: "England", size: "medium" as const, temperament: "Friendly, Courageous, Calm", lifespan: "8-10 years", imageUrl: IMGS.bulldog, group: "Non-Sporting", rarity: "common" as const },
  { id: "beagle", name: "Beagle", description: "Curious, merry, and friendly! Beagles are scent hounds with a nose that's always to the ground and a howl that's hard to miss.", origin: "England", size: "small" as const, temperament: "Merry, Friendly, Curious", lifespan: "10-15 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "common" as const },
  { id: "yorkshire-terrier", name: "Yorkshire Terrier", description: "Tiny but feisty! Yorkies pack a huge personality into a small body. They're affectionate yet bold and make great watchdogs.", origin: "England", size: "small" as const, temperament: "Affectionate, Sprightly, Tomboyish", lifespan: "11-15 years", imageUrl: IMGS.yorkie, group: "Toy", rarity: "common" as const },
  { id: "dachshund", name: "Dachshund", description: "Long-bodied and short-legged, Dachshunds are clever and lively. Originally bred to hunt badgers, they still love to dig!", origin: "Germany", size: "small" as const, temperament: "Stubborn, Devoted, Playful", lifespan: "12-16 years", imageUrl: IMGS.dachshund, group: "Hound", rarity: "common" as const },
  { id: "boxer", name: "Boxer", description: "Playful, bright, and energetic! Boxers are known for their exuberant personality and their love of jumping on people they like.", origin: "Germany", size: "large" as const, temperament: "Fun-Loving, Bright, Active", lifespan: "10-12 years", imageUrl: IMGS.boxer, group: "Working", rarity: "common" as const },
  { id: "shih-tzu", name: "Shih Tzu", description: "Regal and outgoing! Shih Tzus were bred to be companions for Chinese royalty. They love cuddling and being the center of attention.", origin: "Tibet/China", size: "small" as const, temperament: "Affectionate, Playful, Outgoing", lifespan: "10-18 years", imageUrl: IMGS.shih, group: "Toy", rarity: "common" as const },
  { id: "pomeranian", name: "Pomeranian", description: "Fluffy and foxy! Pomeranians are vivacious little extroverts who think they're much bigger than they are. Full of attitude!", origin: "Germany/Poland", size: "small" as const, temperament: "Lively, Bold, Inquisitive", lifespan: "12-16 years", imageUrl: IMGS.pom, group: "Toy", rarity: "common" as const },
  { id: "pug", name: "Pug", description: "Mischievous and charming! Pugs are even-tempered and have a love of food. Their wrinkly face and curly tail are their trademarks.", origin: "China", size: "small" as const, temperament: "Charming, Mischievous, Loving", lifespan: "13-15 years", imageUrl: IMGS.pug, group: "Toy", rarity: "common" as const },
  { id: "maltese", name: "Maltese", description: "Gentle and fearless! Maltese are ancient lapdogs draped in long silky white hair. They thrive on human attention and cuddles.", origin: "Malta", size: "small" as const, temperament: "Gentle, Playful, Fearless", lifespan: "12-15 years", imageUrl: IMGS.generic5, group: "Toy", rarity: "common" as const },
  { id: "chihuahua", name: "Chihuahua", description: "The smallest dog breed with the biggest personality! Chihuahuas are charming, graceful, and sassy — completely devoted to their person.", origin: "Mexico", size: "small" as const, temperament: "Charming, Graceful, Sassy", lifespan: "14-16 years", imageUrl: IMGS.generic3, group: "Toy", rarity: "common" as const },
  { id: "cocker-spaniel", name: "Cocker Spaniel", description: "Merry, frolicsome, and trusting! Cocker Spaniels are eager to please with beautiful silky coats and big expressive eyes.", origin: "England/Spain", size: "medium" as const, temperament: "Merry, Trusting, Gentle", lifespan: "10-14 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "common" as const },
  { id: "english-springer-spaniel", name: "English Springer Spaniel", description: "Friendly and eager to please! Springers are enthusiastic hunters and affectionate family companions with limitless energy.", origin: "England", size: "medium" as const, temperament: "Friendly, Playful, Obedient", lifespan: "12-14 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "common" as const },
  { id: "boston-terrier", name: "Boston Terrier", description: "The American Gentleman! Boston Terriers are bright and amusing in a tuxedo-like coat. They're adaptable city dogs full of character.", origin: "United States", size: "small" as const, temperament: "Friendly, Bright, Amusing", lifespan: "11-13 years", imageUrl: IMGS.frenchie, group: "Non-Sporting", rarity: "common" as const },
  { id: "bichon-frise", name: "Bichon Frisé", description: "Cheerful, gentle, and playful! Bichon Frisés are cloud-like white puffballs who make friends with everyone they meet.", origin: "Belgium/France", size: "small" as const, temperament: "Cheerful, Gentle, Playful", lifespan: "14-15 years", imageUrl: IMGS.samoyed, group: "Non-Sporting", rarity: "common" as const },
  { id: "miniature-schnauzer", name: "Miniature Schnauzer", description: "Fearless and friendly! Mini Schnauzers are sturdy little dogs with a distinctive bearded face and big, spirited personality.", origin: "Germany", size: "small" as const, temperament: "Friendly, Smart, Obedient", lifespan: "12-15 years", imageUrl: IMGS.schnauzer, group: "Terrier", rarity: "common" as const },
  { id: "west-highland-white-terrier", name: "West Highland White Terrier", description: "Happy and self-confident! Westies are hardy little terriers with a bright white coat and a deeply loyal heart.", origin: "Scotland", size: "small" as const, temperament: "Happy, Hardy, Spirited", lifespan: "13-15 years", imageUrl: IMGS.samoyed, group: "Terrier", rarity: "common" as const },
  { id: "shetland-sheepdog", name: "Shetland Sheepdog", description: "A miniature Lassie! Shelties are intensely loyal to their families and excel at agility competitions with their nimble bodies.", origin: "Scotland", size: "small" as const, temperament: "Loyal, Hardworking, Playful", lifespan: "12-14 years", imageUrl: IMGS.sheltie, group: "Herding", rarity: "common" as const },
  { id: "cairn-terrier", name: "Cairn Terrier", description: "The original Toto from Wizard of Oz! Cairn Terriers are alert, cheerful, and love to dig. They're fearless for their small size.", origin: "Scotland", size: "small" as const, temperament: "Alert, Cheerful, Curious", lifespan: "13-15 years", imageUrl: IMGS.generic4, group: "Terrier", rarity: "common" as const },
  { id: "dalmatian", name: "Dalmatian", description: "Spotted and spirited! Dalmatians were born to run alongside carriages. They're energetic, dignified, and loyal family protectors.", origin: "Croatia", size: "large" as const, temperament: "Dignified, Loyal, Energetic", lifespan: "11-13 years", imageUrl: IMGS.dalmatian, group: "Non-Sporting", rarity: "common" as const },
  { id: "papillon", name: "Papillon", description: "Named for their butterfly-like ears, Papillons are happy and alert. One of the most obedient toy breeds, they love agility sports.", origin: "France/Belgium", size: "small" as const, temperament: "Happy, Alert, Friendly", lifespan: "14-16 years", imageUrl: IMGS.generic7, group: "Toy", rarity: "common" as const },
  { id: "havanese", name: "Havanese", description: "Cuba's national dog! Havanese are springy, curious, and social. They thrive on human companionship and adapt to any lifestyle.", origin: "Cuba", size: "small" as const, temperament: "Responsive, Outgoing, Funny", lifespan: "14-16 years", imageUrl: IMGS.generic5, group: "Toy", rarity: "common" as const },
  { id: "vizsla", name: "Vizsla", description: "Hungary's golden dog! Vizslas are gentle, loyal, and affectionate. They bond so closely to their family they're called 'Velcro dogs.'", origin: "Hungary", size: "medium" as const, temperament: "Affectionate, Gentle, Energetic", lifespan: "12-14 years", imageUrl: IMGS.generic6, group: "Sporting", rarity: "common" as const },
  { id: "weimaraner", name: "Weimaraner", description: "The Ghost Dog! Weimaraners have striking silver-grey coats and pale eyes. They're friendly, fearless, and always ready for action.", origin: "Germany", size: "large" as const, temperament: "Friendly, Fearless, Alert", lifespan: "11-14 years", imageUrl: IMGS.generic6, group: "Sporting", rarity: "common" as const },
  { id: "pointer", name: "Pointer", description: "Born to point! Pointers are hard-driving, wide-ranging bird dogs who are gentle and loyal at home but all-business in the field.", origin: "England", size: "large" as const, temperament: "Hard-Driving, Loyal, Gentle", lifespan: "12-17 years", imageUrl: IMGS.generic2, group: "Sporting", rarity: "common" as const },
  { id: "collie", name: "Collie", description: "Lassie's breed! Collies are devoted family dogs, graceful and athletic with a stunning coat and deep loyalty to their people.", origin: "Scotland", size: "large" as const, temperament: "Loyal, Graceful, Devoted", lifespan: "12-14 years", imageUrl: IMGS.collie, group: "Herding", rarity: "common" as const },
  { id: "welsh-corgi-pembroke", name: "Pembroke Welsh Corgi", description: "The Queen's favorite! Corgis are bold, tenacious, and friendly. Their big-dog attitude in a long, low body is endlessly charming.", origin: "Wales", size: "small" as const, temperament: "Bold, Tenacious, Friendly", lifespan: "12-13 years", imageUrl: IMGS.corgi, group: "Herding", rarity: "common" as const },
  { id: "standard-schnauzer", name: "Standard Schnauzer", description: "A reliable, spirited dog! Standard Schnauzers are versatile working dogs — good-natured with family but serious when on guard.", origin: "Germany", size: "medium" as const, temperament: "Spirited, Reliable, Intelligent", lifespan: "13-16 years", imageUrl: IMGS.schnauzer, group: "Working", rarity: "common" as const },
  { id: "scottish-terrier", name: "Scottish Terrier", description: "Dignified and independent, the Scottie is a bold and jaunty little dog. They're aloof with strangers but loyal to their family.", origin: "Scotland", size: "small" as const, temperament: "Independent, Dignified, Alert", lifespan: "11-13 years", imageUrl: IMGS.generic9, group: "Terrier", rarity: "common" as const },
  { id: "old-english-sheepdog", name: "Old English Sheepdog", description: "The shaggy dog! OES are adaptable, gentle, and comical. Their enormous coat and rolling gait make them impossible to miss.", origin: "England", size: "large" as const, temperament: "Adaptable, Gentle, Funny", lifespan: "10-12 years", imageUrl: IMGS.generic1, group: "Herding", rarity: "common" as const },
  { id: "english-setter", name: "English Setter", description: "Gentle and mellow off the field, yet a tireless bird dog on it. English Setters have a unique speckled 'belton' coat pattern.", origin: "England", size: "large" as const, temperament: "Gentle, Friendly, Mellow", lifespan: "12 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "common" as const },
  { id: "bull-terrier", name: "Bull Terrier", description: "The clown of the terrier world! Bull Terriers are playful, mischievous, and full of fire. Their egg-shaped head is totally unique.", origin: "England", size: "medium" as const, temperament: "Playful, Mischievous, Charming", lifespan: "12-13 years", imageUrl: IMGS.bulldog, group: "Terrier", rarity: "common" as const },
  { id: "portuguese-water-dog", name: "Portuguese Water Dog", description: "Obama's dog! Portuguese Water Dogs were bred to help fishermen herd fish and retrieve gear. They're adventurous and web-footed swimmers.", origin: "Portugal", size: "medium" as const, temperament: "Adventurous, Spirited, Obedient", lifespan: "11-13 years", imageUrl: IMGS.poodle, group: "Working", rarity: "common" as const },
  { id: "keeshond", name: "Keeshond", description: "The Dutch barge dog! Keeshonden are lively, intelligent, and outgoing. Their 'spectacles' — distinctive markings around the eyes — are iconic.", origin: "Netherlands", size: "medium" as const, temperament: "Lively, Intelligent, Outgoing", lifespan: "12-15 years", imageUrl: IMGS.samoyed, group: "Non-Sporting", rarity: "common" as const },
  { id: "airedale-terrier", name: "Airedale Terrier", description: "The King of Terriers! Airedales are the largest terrier breed — bold, clever, and versatile. They've served in both World Wars.", origin: "England", size: "large" as const, temperament: "Clever, Courageous, Friendly", lifespan: "11-14 years", imageUrl: IMGS.generic4, group: "Terrier", rarity: "common" as const },
  { id: "german-shorthaired-pointer", name: "German Shorthaired Pointer", description: "The perfect all-around hunting dog! GSPs are versatile, intelligent, and enthusiastic — they love to run and swim all day long.", origin: "Germany", size: "large" as const, temperament: "Friendly, Smart, Willing", lifespan: "10-12 years", imageUrl: IMGS.generic6, group: "Sporting", rarity: "common" as const },

  // Uncommon (30 breeds)
  { id: "siberian-husky", name: "Siberian Husky", description: "Striking and mischievous, Huskies are born to run. These pack dogs love adventure and have a wolf-like beauty that turns heads.", origin: "Siberia, Russia", size: "medium" as const, temperament: "Outgoing, Mischievous, Loyal", lifespan: "12-14 years", imageUrl: IMGS.husky, group: "Working", rarity: "uncommon" as const },
  { id: "rottweiler", name: "Rottweiler", description: "Loyal, loving, and confident guardians. Rotties are calm and devoted family protectors with a teddy-bear heart underneath.", origin: "Germany", size: "large" as const, temperament: "Loyal, Loving, Confident", lifespan: "9-10 years", imageUrl: IMGS.rott, group: "Working", rarity: "uncommon" as const },
  { id: "doberman-pinscher", name: "Doberman Pinscher", description: "Sleek and powerful with a loyal heart. Dobermans are highly intelligent working dogs and devoted family protectors.", origin: "Germany", size: "large" as const, temperament: "Loyal, Fearless, Alert", lifespan: "10-12 years", imageUrl: IMGS.doberman, group: "Working", rarity: "uncommon" as const },
  { id: "australian-shepherd", name: "Australian Shepherd", description: "Smart and work-oriented! Aussies are tireless herding dogs with stunning merle coats and a love for having a job to do.", origin: "United States", size: "medium" as const, temperament: "Smart, Work-Oriented, Exuberant", lifespan: "12-15 years", imageUrl: IMGS.aussie, group: "Herding", rarity: "uncommon" as const },
  { id: "cavalier-king-charles-spaniel", name: "Cavalier King Charles Spaniel", description: "Sweet, gentle, and graceful! Cavaliers are the perfect lap dog but still love outdoor activities. Pure royalty in small packages.", origin: "United Kingdom", size: "small" as const, temperament: "Gentle, Graceful, Affectionate", lifespan: "12-15 years", imageUrl: IMGS.cavalier, group: "Toy", rarity: "uncommon" as const },
  { id: "akita", name: "Akita", description: "Japan's national dog and symbol of loyalty! Akitas are dignified and courageous. Their unwavering loyalty is legendary — Hachiko was an Akita.", origin: "Japan", size: "large" as const, temperament: "Loyal, Dignified, Courageous", lifespan: "10-13 years", imageUrl: IMGS.akita, group: "Working", rarity: "uncommon" as const },
  { id: "alaskan-malamute", name: "Alaskan Malamute", description: "A powerful arctic sled dog, Malamutes are playful and affectionate. They're one of the oldest sled dog breeds in the world.", origin: "Alaska, USA", size: "large" as const, temperament: "Playful, Affectionate, Powerful", lifespan: "10-14 years", imageUrl: IMGS.husky, group: "Working", rarity: "uncommon" as const },
  { id: "belgian-malinois", name: "Belgian Malinois", description: "The elite working dog of choice for military and police worldwide. Malinois are intensely driven, agile, and fiercely loyal.", origin: "Belgium", size: "medium" as const, temperament: "Confident, Hardworking, Protective", lifespan: "14-16 years", imageUrl: IMGS.mali, group: "Herding", rarity: "uncommon" as const },
  { id: "cane-corso", name: "Cane Corso", description: "An ancient Italian mastiff bred as a guardian. The Cane Corso is powerful, loyal, and serious — not for inexperienced owners.", origin: "Italy", size: "large" as const, temperament: "Affectionate, Intelligent, Majestic", lifespan: "9-12 years", imageUrl: IMGS.rott, group: "Working", rarity: "uncommon" as const },
  { id: "bloodhound", name: "Bloodhound", description: "The scenting genius! Bloodhounds have the most powerful nose of any dog — they can track a scent trail that's days old over miles.", origin: "Belgium", size: "large" as const, temperament: "Stubborn, Affectionate, Gentle", lifespan: "10-12 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "uncommon" as const },
  { id: "irish-setter", name: "Irish Setter", description: "The red-coated showstopper! Irish Setters are rollicking, sweet-natured dogs with mahogany coats and boundless enthusiasm for life.", origin: "Ireland", size: "large" as const, temperament: "Rollicking, Affectionate, Sweet", lifespan: "12-15 years", imageUrl: IMGS.generic8, group: "Sporting", rarity: "uncommon" as const },
  { id: "newfoundland", name: "Newfoundland", description: "The gentle giant of the dog world! Newfoundlands are sweet, patient, and devoted. They're natural water rescue dogs who love to swim.", origin: "Canada", size: "giant" as const, temperament: "Sweet, Patient, Devoted", lifespan: "9-10 years", imageUrl: IMGS.newfie, group: "Working", rarity: "uncommon" as const },
  { id: "saint-bernard", name: "Saint Bernard", description: "Famous Alpine rescuers! Saint Bernards are patient, gentle giants who have saved thousands of people trapped in mountain snow.", origin: "Switzerland", size: "giant" as const, temperament: "Patient, Gentle, Friendly", lifespan: "8-10 years", imageUrl: IMGS.saint, group: "Working", rarity: "uncommon" as const },
  { id: "bullmastiff", name: "Bullmastiff", description: "A fearless guardian! Bullmastiffs were bred to silently track and pin poachers. They're affectionate and reliable with their families.", origin: "England", size: "large" as const, temperament: "Affectionate, Fearless, Reliable", lifespan: "7-9 years", imageUrl: IMGS.bulldog, group: "Working", rarity: "uncommon" as const },
  { id: "rhodesian-ridgeback", name: "Rhodesian Ridgeback", description: "The African Lion Dog! Rhodesian Ridgebacks have a distinctive ridge of hair along their back and were bred to hunt lions in Africa.", origin: "South Africa", size: "large" as const, temperament: "Dignified, Strong-Willed, Loyal", lifespan: "10 years", imageUrl: IMGS.generic6, group: "Hound", rarity: "uncommon" as const },
  { id: "chow-chow", name: "Chow Chow", description: "Ancient and lion-like! Chow Chows are one of the oldest breeds with a distinctive blue-black tongue and aloof, cat-like personality.", origin: "China", size: "medium" as const, temperament: "Dignified, Bright, Serious-Minded", lifespan: "8-12 years", imageUrl: IMGS.chow, group: "Non-Sporting", rarity: "uncommon" as const },
  { id: "whippet", name: "Whippet", description: "A greyhound in miniature! Whippets are lightning-fast yet incredibly gentle and calm at home. They're the 'poor man's racehorse.'", origin: "England", size: "medium" as const, temperament: "Calm, Affectionate, Playful", lifespan: "12-15 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "uncommon" as const },
  { id: "bernese-mountain-dog", name: "Bernese Mountain Dog", description: "A majestic tri-colored giant from the Swiss Alps. Berners are calm, gentle, and strong — originally used to pull carts.", origin: "Switzerland", size: "large" as const, temperament: "Good-Natured, Calm, Strong", lifespan: "7-10 years", imageUrl: IMGS.berner, group: "Working", rarity: "uncommon" as const },
  { id: "bouvier-des-flandres", name: "Bouvier des Flandres", description: "A rugged Belgian herding dog! Bouviers are intelligent, loyal, and versatile — used by police, military, and as guide dogs.", origin: "Belgium", size: "large" as const, temperament: "Rational, Gentle, Loyal", lifespan: "10-12 years", imageUrl: IMGS.generic9, group: "Herding", rarity: "uncommon" as const },
  { id: "flat-coated-retriever", name: "Flat-Coated Retriever", description: "Forever young! Flat-Coats are described as Peter Pan dogs — they maintain their puppyish enthusiasm and optimism throughout their lives.", origin: "England", size: "large" as const, temperament: "Optimistic, Good-Humored, Active", lifespan: "8-10 years", imageUrl: IMGS.generic2, group: "Sporting", rarity: "uncommon" as const },
  { id: "nova-scotia-duck-tolling-retriever", name: "Nova Scotia Duck Tolling Retriever", description: "The Toller lures waterfowl by playing at the water's edge — then retrieves them. This clever reddish breed is athletic and curious.", origin: "Canada", size: "medium" as const, temperament: "Alert, Outgoing, Clever", lifespan: "12-14 years", imageUrl: IMGS.golden, group: "Sporting", rarity: "uncommon" as const },
  { id: "gordon-setter", name: "Gordon Setter", description: "Scotland's setter! Gordon Setters are stylish, substantial, and deliberate. Their black-and-tan coat is striking and distinctive.", origin: "Scotland", size: "large" as const, temperament: "Alert, Confident, Loyal", lifespan: "12-13 years", imageUrl: IMGS.generic2, group: "Sporting", rarity: "uncommon" as const },
  { id: "norwegian-elkhound", name: "Norwegian Elkhound", description: "One of the oldest northern dog breeds! Viking companions that hunted elk and bear. Hardy, bold, and devoted to their families.", origin: "Norway", size: "medium" as const, temperament: "Bold, Hardy, Devoted", lifespan: "12-15 years", imageUrl: IMGS.husky, group: "Hound", rarity: "uncommon" as const },
  { id: "greyhound", name: "Greyhound", description: "The world's fastest dog, reaching 45 mph! Despite their speed, Greyhounds are incredibly gentle and love lounging as couch potatoes.", origin: "Egypt/England", size: "large" as const, temperament: "Gentle, Independent, Noble", lifespan: "10-13 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "uncommon" as const },
  { id: "chesapeake-bay-retriever", name: "Chesapeake Bay Retriever", description: "A uniquely American retriever! Chesapeakes were bred in Maryland's cold bay waters and have a distinctive wavy, oily coat.", origin: "United States", size: "large" as const, temperament: "Affectionate, Bright, Sensitive", lifespan: "10-13 years", imageUrl: IMGS.lab, group: "Sporting", rarity: "uncommon" as const },
  { id: "welsh-corgi-cardigan", name: "Cardigan Welsh Corgi", description: "The older Corgi with a long tail! Cardigans are loyal, affectionate, and smart — built low to the ground to herd cattle.", origin: "Wales", size: "small" as const, temperament: "Loyal, Affectionate, Smart", lifespan: "12-15 years", imageUrl: IMGS.corgi, group: "Herding", rarity: "uncommon" as const },
  { id: "finnish-spitz", name: "Finnish Spitz", description: "Finland's national dog! The 'Barking Bird Dog' hunts by pointing with its tail and yodeling. They're red-gold and fox-like.", origin: "Finland", size: "medium" as const, temperament: "Lively, Friendly, Independent", lifespan: "13-15 years", imageUrl: IMGS.shiba, group: "Non-Sporting", rarity: "uncommon" as const },
  { id: "spinone-italiano", name: "Spinone Italiano", description: "Italy's ancient hunting dog! Spinones are gentle, sociable, and patient with their characteristic wiry coat and gentle expression.", origin: "Italy", size: "large" as const, temperament: "Gentle, Patient, Sociable", lifespan: "10-12 years", imageUrl: IMGS.generic9, group: "Sporting", rarity: "uncommon" as const },
  { id: "giant-schnauzer", name: "Giant Schnauzer", description: "A powerful, dominant working dog! Giant Schnauzers are highly intelligent and energetic. They were bred to drive cattle to market.", origin: "Germany", size: "large" as const, temperament: "Loyal, Reliable, Powerful", lifespan: "12-15 years", imageUrl: IMGS.schnauzer, group: "Working", rarity: "uncommon" as const },
  { id: "miniature-bull-terrier", name: "Miniature Bull Terrier", description: "A comical little powerhouse! Mini Bull Terriers have the same egg-shaped head and playful personality as their larger counterpart in a compact package.", origin: "England", size: "small" as const, temperament: "Upbeat, Mischievous, Comical", lifespan: "11-13 years", imageUrl: IMGS.bulldog, group: "Terrier", rarity: "uncommon" as const },

  // Rare (20 breeds)
  { id: "border-collie", name: "Border Collie", description: "The world's premier sheep-herding dog. Border Collies are obsessive workers with lightning-fast reflexes and an intense stare.", origin: "Anglo-Scottish border", size: "medium" as const, temperament: "Energetic, Intelligent, Responsive", lifespan: "12-15 years", imageUrl: IMGS.border, group: "Herding", rarity: "rare" as const },
  { id: "great-dane", name: "Great Dane", description: "The gentle giant! Great Danes are friendly and patient despite their massive size. They're known as the 'Apollo of Dogs.'", origin: "Germany", size: "giant" as const, temperament: "Friendly, Patient, Dependable", lifespan: "7-10 years", imageUrl: IMGS.great_dane, group: "Working", rarity: "rare" as const },
  { id: "samoyed", name: "Samoyed", description: "The smiling white cloud! Samoyeds have a permanent smile thanks to their upturned mouth corners. They're gentle and devoted companions.", origin: "Siberia, Russia", size: "medium" as const, temperament: "Adaptable, Friendly, Gentle", lifespan: "12-14 years", imageUrl: IMGS.samoyed, group: "Working", rarity: "rare" as const },
  { id: "shiba-inu", name: "Shiba Inu", description: "The iconic Japanese dog! Shibas are alert and spirited with a bold personality. They're also internet famous for their dramatic expressions.", origin: "Japan", size: "small" as const, temperament: "Alert, Active, Attentive", lifespan: "13-16 years", imageUrl: IMGS.shiba, group: "Non-Sporting", rarity: "rare" as const },
  { id: "leonberger", name: "Leonberger", description: "Bred to look like a lion! Leonbergers are gentle, loving giants that were once considered the dog of royalty across Europe.", origin: "Germany", size: "giant" as const, temperament: "Gentle, Loving, Friendly", lifespan: "7 years", imageUrl: IMGS.newfie, group: "Working", rarity: "rare" as const },
  { id: "afghan-hound", name: "Afghan Hound", description: "One of the most glamorous dogs alive! Afghan Hounds are aloof and aristocratic with a flowing silky coat and remarkable speed.", origin: "Afghanistan", size: "large" as const, temperament: "Aloof, Clownish, Dignified", lifespan: "12-18 years", imageUrl: IMGS.afghan, group: "Hound", rarity: "rare" as const },
  { id: "irish-wolfhound", name: "Irish Wolfhound", description: "The tallest dog breed! Irish Wolfhounds were bred to hunt wolves and elk. Despite their size, they're gentle, patient, and thoughtful.", origin: "Ireland", size: "giant" as const, temperament: "Patient, Thoughtful, Generous", lifespan: "6-8 years", imageUrl: IMGS.great_dane, group: "Hound", rarity: "rare" as const },
  { id: "mastiff", name: "Mastiff", description: "An ancient breed! Mastiffs are among the heaviest dogs in the world, yet they're gentle and patient. Caesar wrote about them in 55 BC.", origin: "England", size: "giant" as const, temperament: "Good-Natured, Courageous, Dignified", lifespan: "6-10 years", imageUrl: IMGS.bulldog, group: "Working", rarity: "rare" as const },
  { id: "lagotto-romagnolo", name: "Lagotto Romagnolo", description: "Italy's truffle dog! Lagottos are used to hunt the world's most expensive food — truffles. Their curly coat is waterproof and low-shedding.", origin: "Italy", size: "medium" as const, temperament: "Loving, Active, Keen", lifespan: "15-17 years", imageUrl: IMGS.poodle, group: "Sporting", rarity: "rare" as const },
  { id: "alaskan-klee-kai", name: "Alaskan Klee Kai", description: "A miniature Husky look-alike! Alaskan Klee Kais are intelligent, curious, and highly active. They're rare and relatively new breeds.", origin: "United States", size: "small" as const, temperament: "Intelligent, Curious, Active", lifespan: "13-16 years", imageUrl: IMGS.husky, group: "Non-Sporting", rarity: "rare" as const },
  { id: "catahoula-leopard-dog", name: "Catahoula Leopard Dog", description: "Louisiana's state dog! Catahoulas have merle coats, multi-colored eyes, and webbed feet. They were used to hunt wild boar.", origin: "United States", size: "large" as const, temperament: "Energetic, Inquisitive, Assertive", lifespan: "10-14 years", imageUrl: IMGS.aussie, group: "Herding", rarity: "rare" as const },
  { id: "korean-jindo", name: "Korean Jindo", description: "A Korean national treasure! Jindos are fiercely loyal and are known for finding their way home from great distances. They're catlike in their cleanliness.", origin: "South Korea", size: "medium" as const, temperament: "Loyal, Alert, Brave", lifespan: "14-15 years", imageUrl: IMGS.shiba, group: "Non-Sporting", rarity: "rare" as const },
  { id: "treeing-walker-coonhound", name: "Treeing Walker Coonhound", description: "Built to chase raccoons up trees! Treeing Walker Coonhounds are speedy, smart, and confident with a musical hound voice.", origin: "United States", size: "large" as const, temperament: "Clever, Confident, Courageous", lifespan: "12-13 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "rare" as const },
  { id: "american-foxhound", name: "American Foxhound", description: "America's original scent hound! George Washington helped develop this breed for fox hunting. They have a musical howl and unlimited stamina.", origin: "United States", size: "large" as const, temperament: "Kind, Loyal, Sweet-Tempered", lifespan: "11-13 years", imageUrl: IMGS.beagle, group: "Hound", rarity: "rare" as const },
  { id: "pharaoh-hound", name: "Pharaoh Hound", description: "The blushing dog! Pharaoh Hounds blush pink on their nose and ears when excited. These ancient dogs were probably brought to Malta by Phoenician traders.", origin: "Malta", size: "medium" as const, temperament: "Friendly, Intelligent, Trainable", lifespan: "11-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "rare" as const },
  { id: "ibizan-hound", name: "Ibizan Hound", description: "A natural athlete! Ibizan Hounds can jump 5 feet from a standstill. They were used to hunt rabbits on the Spanish Balearic islands for centuries.", origin: "Spain", size: "large" as const, temperament: "Clownish, Warm, Engaging", lifespan: "11-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "rare" as const },
  { id: "xoloitzcuintli", name: "Xoloitzcuintli", description: "One of the world's oldest breeds! The hairless Xolo was worshipped by Aztecs and believed to guide the dead to the underworld. Still rare today.", origin: "Mexico", size: "medium" as const, temperament: "Loyal, Alert, Calm", lifespan: "13-18 years", imageUrl: IMGS.generic3, group: "Non-Sporting", rarity: "rare" as const },
  { id: "peruvian-inca-orchid", name: "Peruvian Inca Orchid", description: "Peru's national dog! Mostly hairless with spotted skin, these dogs ran with the Inca and were kept as warmth-providers and bed warmers.", origin: "Peru", size: "medium" as const, temperament: "Loyal, Friendly, Alert", lifespan: "11-12 years", imageUrl: IMGS.generic3, group: "Non-Sporting", rarity: "rare" as const },
  { id: "american-hairless-terrier", name: "American Hairless Terrier", description: "America's only hairless breed! Developed from a rare mutation in Rat Terriers, they're playful, intelligent, and hypoallergenic.", origin: "United States", size: "small" as const, temperament: "Energetic, Inquisitive, Alert", lifespan: "14-16 years", imageUrl: IMGS.generic3, group: "Terrier", rarity: "rare" as const },
  { id: "canaan-dog", name: "Canaan Dog", description: "Israel's national dog and one of the world's oldest breeds! Canaan Dogs survived for centuries in the desert using their natural instincts.", origin: "Israel", size: "medium" as const, temperament: "Alert, Vigilant, Devoted", lifespan: "12-15 years", imageUrl: IMGS.shiba, group: "Herding", rarity: "rare" as const },

  // Legendary (10 breeds)
  { id: "basenji", name: "Basenji", description: "The barkless dog from Africa! Basenjis yodel instead of bark and are fastidiously clean — they groom themselves like cats.", origin: "Central Africa", size: "small" as const, temperament: "Independent, Smart, Poised", lifespan: "13-14 years", imageUrl: IMGS.shiba, group: "Hound", rarity: "legendary" as const },
  { id: "saluki", name: "Saluki", description: "One of the oldest dog breeds! Ancient pharaohs kept Salukis for hunting. They're elegant, fast, and deeply devoted to one person.", origin: "Middle East", size: "medium" as const, temperament: "Gentle, Dignified, Independent", lifespan: "12-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "legendary" as const },
  { id: "tibetan-mastiff", name: "Tibetan Mastiff", description: "An ancient guardian of the Himalayas! Tibetan Mastiffs are massive, bear-like dogs that were sold for millions in China as status symbols.", origin: "Tibet", size: "giant" as const, temperament: "Tenacious, Strong-Willed, Intelligent", lifespan: "10-12 years", imageUrl: IMGS.chow, group: "Working", rarity: "legendary" as const },
  { id: "azawakh", name: "Azawakh", description: "A West African sighthound of breathtaking elegance. Azawakhs are extremely rare outside Africa and bond intensely with one family.", origin: "West Africa", size: "medium" as const, temperament: "Affectionate, Rugged, Attentive", lifespan: "12-15 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "legendary" as const },
  { id: "thai-ridgeback", name: "Thai Ridgeback", description: "One of only three ridgeback breeds! Thai Ridgebacks were isolated in Thailand for centuries and retain primitive instincts. Extremely rare outside Asia.", origin: "Thailand", size: "medium" as const, temperament: "Independent, Athletic, Loyal", lifespan: "12-13 years", imageUrl: IMGS.akita, group: "Hound", rarity: "legendary" as const },
  { id: "cirneco-dell-etna", name: "Cirneco dell'Etna", description: "Sicily's rabbit hunter! This ancient breed lived in the shadow of Mount Etna for 3,000 years. Lean, athletic, and effortlessly elegant.", origin: "Sicily, Italy", size: "medium" as const, temperament: "Independent, Gentle, Athletic", lifespan: "12-14 years", imageUrl: IMGS.greyhound, group: "Hound", rarity: "legendary" as const },
  { id: "portuguese-podengo-pequeno", name: "Portuguese Podengo Pequeno", description: "Portugal's smallest rabbit hunter! Ancient, lively, and agile, the Podengo has changed little since Phoenician traders brought them to Portugal.", origin: "Portugal", size: "small" as const, temperament: "Lively, Alert, Playful", lifespan: "10-15 years", imageUrl: IMGS.generic7, group: "Hound", rarity: "legendary" as const },
  { id: "carolina-dog", name: "Carolina Dog", description: "America's wild dog! Carolina Dogs, also called American Dingoes, were feral dogs living along the Southeast US for thousands of years. A living fossil!", origin: "United States", size: "medium" as const, temperament: "Primitive, Loyal, Resourceful", lifespan: "12-15 years", imageUrl: IMGS.generic6, group: "Hound", rarity: "legendary" as const },
  { id: "lagotto-truffle-hunter", name: "Otterhound", description: "Critically endangered! Fewer than 1,000 Otterhounds exist worldwide. This shaggy, web-footed breed was bred exclusively to hunt otters.", origin: "England", size: "large" as const, temperament: "Amiable, Boisterous, Jovial", lifespan: "10-13 years", imageUrl: IMGS.generic1, group: "Hound", rarity: "legendary" as const },
  { id: "mudi", name: "Mudi", description: "Hungary's rarest dog! The Mudi is a versatile farm dog that can herd sheep, hunt boars, and even rescue avalanche victims. Nearly wiped out in WWII.", origin: "Hungary", size: "medium" as const, temperament: "Versatile, Intelligent, Active", lifespan: "12-14 years", imageUrl: IMGS.aussie, group: "Herding", rarity: "legendary" as const },
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

  // Normalise to formats OpenAI actually accepts
  const MIME_MAP: Record<string, string> = {
    "image/jpg": "image/jpeg",
    "image/heic": "image/jpeg",
    "image/heif": "image/jpeg",
    "image/bmp": "image/png",
    "image/tiff": "image/png",
  };
  const SUPPORTED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const resolvedMime = MIME_MAP[mimeType] ?? (SUPPORTED.includes(mimeType) ? mimeType : "image/jpeg");

  // Detect actual format from magic bytes as a last-resort override
  const header4 = Buffer.from(imageBase64.slice(0, 8), "base64");
  let detectedMime = resolvedMime;
  if (header4[0] === 0x89 && header4[1] === 0x50) detectedMime = "image/png";
  else if (header4[0] === 0xff && header4[1] === 0xd8) detectedMime = "image/jpeg";
  else if (header4[0] === 0x47 && header4[1] === 0x49) detectedMime = "image/gif";
  else if (header4[0] === 0x52 && header4[4] === 0x57) detectedMime = "image/webp";

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
                url: `data:${detectedMime};base64,${imageBase64}`,
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
    let parsed: { isDog?: boolean; breedName?: string; confidence?: number; funFact?: string } = {};

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
    }

    if (!parsed.isDog) {
      return res.json({ breedId: "", breedName: "", confidence: 0, description: "No dog detected in this image. Try a clearer photo!", isDog: false });
    }

    const detectedName = (parsed.breedName ?? "").toLowerCase();
    const matched = DOG_BREEDS.find((b) => {
      const bn = b.name.toLowerCase();
      return bn === detectedName || bn.includes(detectedName) || detectedName.includes(bn) || bn.split(" ").some((word) => detectedName.includes(word) && word.length > 4);
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
