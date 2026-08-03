#!/usr/bin/env python3
"""Build precise mapping from Stanford Dogs 120 classes to DogDex 100 breeds."""
import json
import os

# Stanford Dogs 120 breed labels (from train_list.mat directory names)
stanford_labels = [
    "Afghan_hound", "African_hunting_dog", "Airedale", "American_Staffordshire_terrier",
    "Appenzeller", "Australian_terrier", "Bedlington_terrier", "Bernese_mountain_dog",
    "Blenheim_spaniel", "Border_collie", "Border_terrier", "Boston_bull",
    "Bouvier_des_Flandres", "Brabancon_griffon", "Brittany_spaniel", "Cardigan",
    "Chesapeake_Bay_retriever", "Chihuahua", "Dandie_Dinmont", "Doberman",
    "English_foxhound", "English_setter", "English_springer", "EntleBucher",
    "Eskimo_dog", "French_bulldog", "German_shepherd", "German_short-haired_pointer",
    "Gordon_setter", "Great_Dane", "Great_Pyrenees", "Greater_Swiss_Mountain_dog",
    "Ibizan_hound", "Irish_setter", "Irish_terrier", "Irish_water_spaniel",
    "Irish_wolfhound", "Italian_greyhound", "Japanese_spaniel", "Kerry_blue_terrier",
    "Labrador_retriever", "Lakeland_terrier", "Leonberg", "Lhasa", "Maltese_dog",
    "Mexican_hairless", "Newfoundland", "Norfolk_terrier", "Norwegian_elkhound",
    "Norwich_terrier", "Old_English_sheepdog", "Pekinese", "Pembroke", "Pomeranian",
    "Rhodesian_ridgeback", "Rottweiler", "Saint_Bernard", "Saluki", "Samoyed",
    "Scotch_terrier", "Scottish_deerhound", "Sealyham_terrier", "Shetland_sheepdog",
    "Shih-Tzu", "Siberian_husky", "Staffordshire_bullterrier", "Sussex_spaniel",
    "Tibetan_mastiff", "Tibetan_terrier", "Walker_hound", "Weimaraner",
    "Welsh_springer_spaniel", "West_Highland_white_terrier", "Yorkshire_terrier",
    "affenpinscher", "basenji", "basset", "beagle", "black-and-tan_coonhound",
    "bloodhound", "bluetick", "borzoi", "boxer", "briard", "bull_mastiff",
    "cairn", "chow", "clumber", "cocker_spaniel", "collie", "curly-coated_retriever",
    "dhole", "dingo", "flat-coated_retriever", "giant_schnauzer", "golden_retriever",
    "groenendael", "keeshond", "kelpie", "komondor", "kuvasz", "malamute",
    "malinois", "miniature_pinscher", "miniature_poodle", "miniature_schnauzer",
    "otterhound", "papillon", "pug", "redbone", "schipperke", "silky_terrier",
    "soft-coated_wheaten_terrier", "standard_poodle", "standard_schnauzer",
    "toy_poodle", "toy_terrier", "vizsla", "whippet", "wire-haired_fox_terrier"
]

# Manual mapping: Stanford name -> DogDex ID
# For breeds not in DogDex, map to the closest related breed or mark None
MANUAL_MAP = {
    # Exact matches
    "Afghan_hound": "afghan-hound",
    "Airedale": "airedale-terrier",
    "Bernese_mountain_dog": "bernese-mountain-dog",
    "Border_collie": "border-collie",
    "Boston_bull": "boston-terrier",
    "Bouvier_des_Flandres": "bouvier-des-flandres",
    "Cardigan": "welsh-corgi-cardigan",
    "Chesapeake_Bay_retriever": "chesapeake-bay-retriever",
    "Chihuahua": "chihuahua",
    "Doberman": "doberman-pinscher",
    "English_setter": "english-setter",
    "English_springer": "english-springer-spaniel",
    "French_bulldog": "french-bulldog",
    "German_shepherd": "german-shepherd",
    "German_short-haired_pointer": "german-shorthaired-pointer",
    "Gordon_setter": "gordon-setter",
    "Great_Dane": "great-dane",
    "Ibizan_hound": "ibizan-hound",
    "Irish_setter": "irish-setter",
    "Irish_wolfhound": "irish-wolfhound",
    "Labrador_retriever": "labrador-retriever",
    "Leonberg": "leonberger",
    "Maltese_dog": "maltese",
    "Newfoundland": "newfoundland",
    "Norwegian_elkhound": "norwegian-elkhound",
    "Old_English_sheepdog": "old-english-sheepdog",
    "Pembroke": "welsh-corgi-pembroke",
    "Pomeranian": "pomeranian",
    "Rhodesian_ridgeback": "rhodesian-ridgeback",
    "Rottweiler": "rottweiler",
    "Saint_Bernard": "saint-bernard",
    "Saluki": "saluki",
    "Samoyed": "samoyed",
    "Shetland_sheepdog": "shetland-sheepdog",
    "Shih-Tzu": "shih-tzu",
    "Siberian_husky": "siberian-husky",
    "Tibetan_mastiff": "tibetan-mastiff",
    "Weimaraner": "weimaraner",
    "West_Highland_white_terrier": "west-highland-white-terrier",
    "Yorkshire_terrier": "yorkshire-terrier",
    "basenji": "basenji",
    "basset": None,  # Basset Hound not in DogDex
    "beagle": "beagle",
    "bloodhound": "bloodhound",
    "boxer": "boxer",
    "bull_mastiff": "bullmastiff",
    "cairn": "cairn-terrier",
    "chow": "chow-chow",
    "cocker_spaniel": "cocker-spaniel",
    "collie": "collie",
    "flat-coated_retriever": "flat-coated-retriever",
    "giant_schnauzer": "giant-schnauzer",
    "golden_retriever": "golden-retriever",
    "keeshond": "keeshond",
    "malamute": "alaskan-malamute",
    "malinois": "belgian-malinois",
    "miniature_pinscher": None,
    "miniature_poodle": None,
    "miniature_schnauzer": "miniature-schnauzer",
    "papillon": "papillon",
    "pug": "pug",
    "standard_poodle": "poodle",
    "standard_schnauzer": "standard-schnauzer",
    "vizsla": "vizsla",
    "whippet": "whippet",

    # Approximate / related breed mappings
    "African_hunting_dog": None,  # African Wild Dog, very rare
    "American_Staffordshire_terrier": None,  # Close to Staffie but distinct
    "Appenzeller": None,
    "Australian_terrier": None,
    "Bedlington_terrier": None,
    "Blenheim_spaniel": "cavalier-king-charles-spaniel",  # Blenheim is a color of CKCS
    "Border_terrier": None,
    "Brabancon_griffon": None,  # Brussels Griffon, not in DogDex
    "Brittany_spaniel": None,
    "Dandie_Dinmont": None,
    "English_foxhound": "american-foxhound",  # Closest hound relative
    "EntleBucher": None,  # Entlebucher Mountain Dog
    "Eskimo_dog": "siberian-husky",  # American Eskimo Dog / Spitz type
    "Great_Pyrenees": None,
    "Greater_Swiss_Mountain_dog": "bernese-mountain-dog",  # Close Swiss mountain dog
    "Irish_terrier": None,
    "Irish_water_spaniel": None,
    "Italian_greyhound": "greyhound",  # Miniature greyhound
    "Japanese_spaniel": "papillon",  # Japanese Chin, related toy spaniel
    "Kerry_blue_terrier": None,
    "Lakeland_terrier": None,
    "Lhasa": None,  # Lhasa Apso
    "Mexican_hairless": "xoloitzcuintli",  # Xolo is the Mexican Hairless
    "Norfolk_terrier": None,
    "Norwich_terrier": None,
    "Pekinese": "pomeranian",  # Pekingese, toy breed
    "Scotch_terrier": "scottish-terrier",  # Old name for Scottish Terrier
    "Scottish_deerhound": "irish-wolfhound",  # Close sighthound relative
    "Sealyham_terrier": None,
    "Staffordshire_bullterrier": None,
    "Sussex_spaniel": None,
    "Tibetan_terrier": None,
    "Walker_hound": "treeing-walker-coonhound",
    "Welsh_springer_spaniel": None,
    "affenpinscher": None,
    "black-and-tan_coonhound": None,
    "bluetick": None,  # Bluetick Coonhound
    "borzoi": "greyhound",  # Russian Wolfhound / sighthound
    "briard": None,
    "clumber": None,  # Clumber Spaniel
    "curly-coated_retriever": None,
    "dhole": None,  # Asian wild dog
    "dingo": "carolina-dog",  # Closest domestic relative
    "groenendael": "belgian-malinois",  # Belgian Sheepdog, same family
    "kelpie": "australian-shepherd",  # Australian working dog
    "komondor": None,
    "kuvasz": None,  # Hungarian guardian dog
    "otterhound": None,
    "redbone": None,  # Redbone Coonhound
    "schipperke": None,
    "silky_terrier": "yorkshire-terrier",  # Australian Silky Terrier, Yorkie relative
    "soft-coated_wheaten_terrier": None,
    "toy_poodle": "poodle",  # Same breed, different size
    "toy_terrier": None,  # English Toy Terrier
    "wire-haired_fox_terrier": None,
}

# Build the mapping
mapping = []
index_to_id = [None] * 120
unmatched = []
matched_ids = set()

for idx, stanford_name in enumerate(stanford_labels):
    dogdex_id = MANUAL_MAP.get(stanford_name)
    if dogdex_id:
        matched_ids.add(dogdex_id)
        mapping.append({
            "stanford_index": idx,
            "stanford_name": stanford_name,
            "dogdex_id": dogdex_id,
            "method": "manual"
        })
        index_to_id[idx] = dogdex_id
    else:
        unmatched.append({"index": idx, "name": stanford_name})

print(f"Matched: {len(mapping)}/120")
print(f"Unmatched (will map to closest or None): {len(unmatched)}")
print()
for u in unmatched:
    print(f"  [{u['index']:3d}] {u['name']}")

# DogDex breeds NOT covered by our 120
all_dogdex_ids = set([
    "labrador-retriever", "french-bulldog", "golden-retriever", "german-shepherd",
    "poodle", "bulldog", "beagle", "yorkshire-terrier", "dachshund", "boxer",
    "shih-tzu", "pomeranian", "pug", "maltese", "chihuahua", "cocker-spaniel",
    "english-springer-spaniel", "boston-terrier", "bichon-frise", "miniature-schnauzer",
    "west-highland-white-terrier", "shetland-sheepdog", "cairn-terrier", "dalmatian",
    "papillon", "havanese", "vizsla", "weimaraner", "pointer", "collie",
    "welsh-corgi-pembroke", "standard-schnauzer", "scottish-terrier",
    "old-english-sheepdog", "english-setter", "bull-terrier", "portuguese-water-dog",
    "keeshond", "airedale-terrier", "german-shorthaired-pointer", "siberian-husky",
    "rottweiler", "doberman-pinscher", "australian-shepherd",
    "cavalier-king-charles-spaniel", "akita", "alaskan-malamute", "belgian-malinois",
    "cane-corso", "bloodhound", "irish-setter", "newfoundland", "saint-bernard",
    "bullmastiff", "rhodesian-ridgeback", "chow-chow", "whippet",
    "bernese-mountain-dog", "bouvier-des-flandres", "flat-coated-retriever",
    "nova-scotia-duck-tolling-retriever", "gordon-setter", "norwegian-elkhound",
    "greyhound", "chesapeake-bay-retriever", "welsh-corgi-cardigan", "finnish-spitz",
    "spinone-italiano", "giant-schnauzer", "miniature-bull-terrier", "border-collie",
    "great-dane", "samoyed", "shiba-inu", "leonberger", "afghan-hound",
    "irish-wolfhound", "mastiff", "lagotto-romagnolo", "alaskan-klee-kai",
    "catahoula-leopard-dog", "korean-jindo", "treeing-walker-coonhound",
    "american-foxhound", "pharaoh-hound", "ibizan-hound", "xoloitzcuintli",
    "peruvian-inca-orchid", "american-hairless-terrier", "canaan-dog", "basenji",
    "saluki", "tibetan-mastiff", "azawakh", "thai-ridgeback", "cirneco-dell-etna",
    "portuguese-podengo-pequeno", "carolina-dog", "otterhound", "mudi",
])
uncovered = sorted(all_dogdex_ids - matched_ids)
print(f"\nDogDex breeds NOT covered by TFLite model ({len(uncovered)}):")
for uid in uncovered:
    print(f"  {uid}")

# Save outputs
workspace_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(workspace_dir, "breed_index_to_id.json"), "w") as f:
    json.dump(index_to_id, f, indent=2)

with open(os.path.join(workspace_dir, "breed_mapping.json"), "w") as f:
    json.dump({
        "stanford_to_dogdex": {m["stanford_index"]: m["dogdex_id"] for m in mapping},
        "details": mapping,
        "unmatched_stanford": unmatched,
        "uncovered_dogdex": uncovered,
    }, f, indent=2)

print(f"\nSaved breed_index_to_id.json and breed_mapping.json")
