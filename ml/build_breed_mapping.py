#!/usr/bin/env python3
"""Build mapping from Stanford Dogs 120 classes to DogDex 100 breeds."""
import json
import os
import re
from difflib import SequenceMatcher

def normalize(name):
    """Normalize breed name for matching."""
    name = name.lower()
    name = re.sub(r'[-_]', ' ', name)
    # Remove common suffixes
    name = name.replace('terrier', '').replace('spaniel', '').replace('retriever', '')
    name = name.replace('hound', '').replace('shepherd', '').replace('bulldog', '')
    name = name.replace('dog', '').replace('pointer', '').replace('mastiff', '')
    name = name.replace('schnauzer', '').replace('poodle', '').replace('collie', '')
    name = name.replace('pinscher', '').replace('corgi', '').replace('pembroke', '')
    name = name.replace('cardigan', '').replace('cardigan welsh', '')
    name = name.replace('cavalier king charles', '').replace('king charles', '')
    name = name.replace('old english sheepdog', 'oes').replace('english', '')
    name = name.replace('staffordshire bull', 'staffordshire')
    name = name.replace('west highland white', 'westie')
    name = name.replace('german short haired', 'gsp').replace('german shorthaired', 'gsp')
    name = name.replace('chesapeake bay', 'chesapeake')
    name = name.replace('nova scotia duck tolling', 'tollers')
    name = name.replace('treeing walker coonhound', 'walker')
    name = name.replace('black and tan coonhound', 'coonhound')
    name = name.replace('curly coated', 'curly').replace('flat coated', 'flat')
    name = name.replace('wire haired', 'wirehair').replace('wire fox', 'wirefox')
    name = name.replace('soft coated wheaten', 'wheaten')
    name = name.replace('greater swiss mountain', 'gsmd')
    name = name.replace('bernese mountain', 'berner').replace('swiss', '')
    name = name.replace('bouvier des flandres', 'bouvier')
    name = name.replace('doberman pinscher', 'doberman')
    name = name.replace('bull mastiff', 'bullmastiff')
    name = name.replace('chow chow', 'chow').replace('chow', 'chow chow')
    name = name.replace('pembroke welsh corgi', 'pembroke corgi')
    name = name.replace('cardigan welsh corgi', 'cardigan corgi')
    name = name.replace('australian shepherd', 'aussie')
    name = name.replace('miniature bull terrier', 'minibull').replace('bull terrier', 'bullterrier')
    name = name.replace('portuguese water', 'portuguese').replace('portuguese podengo', 'podengo')
    name = name.replace('shih tzu', 'shihtzu')
    name = name.replace('american hairless', 'hairless').replace('american staffordshire', 'amstaff')
    name = name.replace('bichon frise', 'bichon').replace('havanese', 'havana')
    name = name.replace('japanese chin', 'japanese spaniel')
    name = name.replace('scotch terrier', 'scottish terrier')
    name = name.replace('norfolk terrier', '').replace('norwich terrier', '')
    name = name.replace('sealyham terrier', '').replace('welsh terrier', '')
    name = name.replace('kerry blue terrier', '').replace('lakeland terrier', '')
    name = name.replace('bedlington terrier', '').replace('border terrier', '')
    name = name.replace('airedale terrier', 'airedale')
    name = name.replace('fox terrier', 'foxterrier')
    name = name.replace('irish terrier', '').replace('tibetan terrier', '')
    name = name.replace('boston bull', 'boston terrier')
    name = name.replace('walker hound', 'walker').replace('english foxhound', 'foxhound')
    name = name.replace('blenheim spaniel', 'cavalier').replace('cavalier', 'cavalier king charles spaniel')
    name = name.replace('pembroke', 'pembroke corgi').replace('cardigan', 'cardigan corgi')
    # Final cleanup
    name = name.strip()
    return name

# DogDex breed IDs and names
dogdex_breeds = {
    "labrador-retriever": "Labrador Retriever",
    "french-bulldog": "French Bulldog",
    "golden-retriever": "Golden Retriever",
    "german-shepherd": "German Shepherd",
    "poodle": "Poodle",
    "bulldog": "Bulldog",
    "beagle": "Beagle",
    "yorkshire-terrier": "Yorkshire Terrier",
    "dachshund": "Dachshund",
    "boxer": "Boxer",
    "shih-tzu": "Shih Tzu",
    "pomeranian": "Pomeranian",
    "pug": "Pug",
    "maltese": "Maltese",
    "chihuahua": "Chihuahua",
    "cocker-spaniel": "Cocker Spaniel",
    "english-springer-spaniel": "English Springer Spaniel",
    "boston-terrier": "Boston Terrier",
    "bichon-frise": "Bichon Frise",
    "miniature-schnauzer": "Miniature Schnauzer",
    "west-highland-white-terrier": "West Highland White Terrier",
    "shetland-sheepdog": "Shetland Sheepdog",
    "cairn-terrier": "Cairn Terrier",
    "dalmatian": "Dalmatian",
    "papillon": "Papillon",
    "havanese": "Havanese",
    "vizsla": "Vizsla",
    "weimaraner": "Weimaraner",
    "pointer": "Pointer",
    "collie": "Collie",
    "welsh-corgi-pembroke": "Welsh Corgi Pembroke",
    "standard-schnauzer": "Standard Schnauzer",
    "scottish-terrier": "Scottish Terrier",
    "old-english-sheepdog": "Old English Sheepdog",
    "english-setter": "English Setter",
    "bull-terrier": "Bull Terrier",
    "portuguese-water-dog": "Portuguese Water Dog",
    "keeshond": "Keeshond",
    "airedale-terrier": "Airedale Terrier",
    "german-shorthaired-pointer": "German Shorthaired Pointer",
    "siberian-husky": "Siberian Husky",
    "rottweiler": "Rottweiler",
    "doberman-pinscher": "Doberman Pinscher",
    "australian-shepherd": "Australian Shepherd",
    "cavalier-king-charles-spaniel": "Cavalier King Charles Spaniel",
    "akita": "Akita",
    "alaskan-malamute": "Alaskan Malamute",
    "belgian-malinois": "Belgian Malinois",
    "cane-corso": "Cane Corso",
    "bloodhound": "Bloodhound",
    "irish-setter": "Irish Setter",
    "newfoundland": "Newfoundland",
    "saint-bernard": "Saint Bernard",
    "bullmastiff": "Bullmastiff",
    "rhodesian-ridgeback": "Rhodesian Ridgeback",
    "chow-chow": "Chow Chow",
    "whippet": "Whippet",
    "bernese-mountain-dog": "Bernese Mountain Dog",
    "bouvier-des-flandres": "Bouvier des Flandres",
    "flat-coated-retriever": "Flat-Coated Retriever",
    "nova-scotia-duck-tolling-retriever": "Nova Scotia Duck Tolling Retriever",
    "gordon-setter": "Gordon Setter",
    "norwegian-elkhound": "Norwegian Elkhound",
    "greyhound": "Greyhound",
    "chesapeake-bay-retriever": "Chesapeake Bay Retriever",
    "welsh-corgi-cardigan": "Welsh Corgi Cardigan",
    "finnish-spitz": "Finnish Spitz",
    "spinone-italiano": "Spinone Italiano",
    "giant-schnauzer": "Giant Schnauzer",
    "miniature-bull-terrier": "Miniature Bull Terrier",
    "border-collie": "Border Collie",
    "great-dane": "Great Dane",
    "samoyed": "Samoyed",
    "shiba-inu": "Shiba Inu",
    "leonberger": "Leonberger",
    "afghan-hound": "Afghan Hound",
    "irish-wolfhound": "Irish Wolfhound",
    "mastiff": "Mastiff",
    "lagotto-romagnolo": "Lagotto Romagnolo",
    "alaskan-klee-kai": "Alaskan Klee Kai",
    "catahoula-leopard-dog": "Catahoula Leopard Dog",
    "korean-jindo": "Korean Jindo",
    "treeing-walker-coonhound": "Treeing Walker Coonhound",
    "american-foxhound": "American Foxhound",
    "pharaoh-hound": "Pharaoh Hound",
    "ibizan-hound": "Ibizan Hound",
    "xoloitzcuintli": "Xoloitzcuintli",
    "peruvian-inca-orchid": "Peruvian Inca Orchid",
    "american-hairless-terrier": "American Hairless Terrier",
    "canaan-dog": "Canaan Dog",
    "basenji": "Basenji",
    "saluki": "Saluki",
    "tibetan-mastiff": "Tibetan Mastiff",
    "azawakh": "Azawakh",
    "thai-ridgeback": "Thai Ridgeback",
    "cirneco-dell-etna": "Cirneco dell'Etna",
    "portuguese-podengo-pequeno": "Portuguese Podengo Pequeno",
    "carolina-dog": "Carolina Dog",
    "otterhound": "Lagotto Truffle Hunter",
    "mudi": "Mudi",
}

# Stanford Dogs labels (from .mat file extraction)
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

# Custom overrides for known matches
OVERRIDES = {
    "Airedale": "airedale-terrier",
    "Labrador_retriever": "labrador-retriever",
    "French_bulldog": "french-bulldog",
    "Golden_retriever": "golden-retriever",
    "German_shepherd": "german-shepherd",
    "Poodle": "poodle",
    "Bulldog": "bulldog",
    "Beagle": "beagle",
    "Yorkshire_terrier": "yorkshire-terrier",
    "Dachshund": "dachshund",
    "Boxer": "boxer",
    "Shih-Tzu": "shih-tzu",
    "Pomeranian": "pomeranian",
    "Pug": "pug",
    "Maltese_dog": "maltese",
    "Chihuahua": "chihuahua",
    "Cocker_spaniel": "cocker-spaniel",
    "English_springer": "english-springer-spaniel",
    "Boston_bull": "boston-terrier",
    "Bichon_frise": "bichon-frise",
    "Miniature_schnauzer": "miniature-schnauzer",
    "West_Highland_white_terrier": "west-highland-white-terrier",
    "Shetland_sheepdog": "shetland-sheepdog",
    "Cairn": "cairn-terrier",
    "Dalmatian": "dalmatian",
    "Papillon": "papillon",
    "Havanese": "havanese",
    "Vizsla": "vizsla",
    "Weimaraner": "weimaraner",
    "Pointer": "pointer",
    "Collie": "collie",
    "Pembroke": "welsh-corgi-pembroke",
    "Cardigan": "welsh-corgi-cardigan",
    "Standard_schnauzer": "standard-schnauzer",
    "Scotch_terrier": "scottish-terrier",
    "Old_English_sheepdog": "old-english-sheepdog",
    "English_setter": "english-setter",
    "Bull_terrier": "bull-terrier",
    "Portuguese_water_dog": "portuguese-water-dog",
    "Keeshond": "keeshond",
    "Airedale": "airedale-terrier",
    "German_short-haired_pointer": "german-shorthaired-pointer",
    "Siberian_husky": "siberian-husky",
    "Rottweiler": "rottweiler",
    "Doberman": "doberman-pinscher",
    "Australian_shepherd": "australian-shepherd",
    "Cavalier_king_charles_spaniel": "cavalier-king-charles-spaniel",
    "Akita": "akita",
    "Alaskan_malamute": "alaskan-malamute",
    "Belgian_malinois": "belgian-malinois",
    "Cane_corso": "cane-corso",
    "Bloodhound": "bloodhound",
    "Irish_setter": "irish-setter",
    "Newfoundland": "newfoundland",
    "Saint_Bernard": "saint-bernard",
    "Bull_mastiff": "bullmastiff",
    "Rhodesian_ridgeback": "rhodesian-ridgeback",
    "Chow": "chow-chow",
    "Whippet": "whippet",
    "Bernese_mountain_dog": "bernese-mountain-dog",
    "Bouvier_des_Flandres": "bouvier-des-flandres",
    "Flat-coated_retriever": "flat-coated-retriever",
    "Nova_scotia_duck_tolling_retriever": "nova-scotia-duck-tolling-retriever",
    "Gordon_setter": "gordon-setter",
    "Norwegian_elkhound": "norwegian-elkhound",
    "Greyhound": "greyhound",
    "Chesapeake_Bay_retriever": "chesapeake-bay-retriever",
    "Finnish_spitz": "finnish-spitz",
    "Spinone_italiano": "spinone-italiano",
    "Giant_schnauzer": "giant-schnauzer",
    "Miniature_bull_terrier": "miniature-bull-terrier",
    "Border_collie": "border-collie",
    "Great_Dane": "great-dane",
    "Samoyed": "samoyed",
    "Shiba_inu": "shiba-inu",
    "Leonberg": "leonberger",
    "Afghan_hound": "afghan-hound",
    "Irish_wolfhound": "irish-wolfhound",
    "Mastiff": "mastiff",
    "Lagotto_romagnolo": "lagotto-romagnolo",
    "Alaskan_klee_kai": "alaskan-klee-kai",
    "Catahoula_leopard_dog": "catahoula-leopard-dog",
    "Korean_jindo": "korean-jindo",
    "Treeing_walker_coonhound": "treeing-walker-coonhound",
    "American_foxhound": "american-foxhound",
    "Pharaoh_hound": "pharaoh-hound",
    "Ibizan_hound": "ibizan-hound",
    "Xoloitzcuintli": "xoloitzcuintli",
    "Peruvian_inca_orchid": "peruvian-inca-orchid",
    "American_hairless_terrier": "american-hairless-terrier",
    "Canaan_dog": "canaan-dog",
    "Basenji": "basenji",
    "Saluki": "saluki",
    "Tibetan_mastiff": "tibetan-mastiff",
    "Azawakh": "azawakh",
    "Thai_ridgeback": "thai-ridgeback",
    "Cirneco_dell_etna": "cirneco-dell-etna",
    "Portuguese_podengo_pequeno": "portuguese-podengo-pequeno",
    "Carolina_dog": "carolina-dog",
    "Mudi": "mudi",
}

# Build mapping: stanford index -> {dogdex_id, confidence_threshold?}
mapping = []
matched_ids = set()
unmatched = []

for idx, stanford_name in enumerate(stanford_labels):
    # Try override first
    if stanford_name in OVERRIDES:
        dogdex_id = OVERRIDES[stanford_name]
        mapping.append({"stanford_index": idx, "stanford_name": stanford_name,
                        "dogdex_id": dogdex_id, "method": "override"})
        matched_ids.add(dogdex_id)
        continue

    # Try exact name match
    stanford_display = stanford_name.replace("_", " ").replace("-", " ")
    found = None
    for did, dname in dogdex_breeds.items():
        if dname.lower() == stanford_display.lower():
            found = did
            break
    if found:
        mapping.append({"stanford_index": idx, "stanford_name": stanford_name,
                        "dogdex_id": found, "method": "exact"})
        matched_ids.add(found)
        continue

    # Try fuzzy matching on normalized names
    best_ratio = 0
    best_id = None
    s_norm = normalize(stanford_display)
    for did, dname in dogdex_breeds.items():
        if did in matched_ids:
            continue
        d_norm = normalize(dname)
        ratio = SequenceMatcher(None, s_norm, d_norm).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_id = did

    if best_ratio > 0.6:
        mapping.append({"stanford_index": idx, "stanford_name": stanford_name,
                        "dogdex_id": best_id, "method": f"fuzzy({best_ratio:.2f})"})
        matched_ids.add(best_id)
    else:
        unmatched.append({"index": idx, "name": stanford_name, "best": best_id, "ratio": best_ratio})

# Summary
print(f"Matched: {len(mapping)}/120")
print(f"Unmatched: {len(unmatched)}")
print()
for u in unmatched:
    print(f"  [{u['index']:3d}] {u['name']:40s} -> best: {u['best']} ({u['ratio']:.2f})")

# Save mapping
output = {
    "stanford_to_dogdex": {m["stanford_index"]: m["dogdex_id"] for m in mapping},
    "details": mapping,
    "unmatched": unmatched,
}
workspace_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(workspace_dir, "breed_mapping.json")
with open(out_path, "w") as f:
    json.dump(output, f, indent=2)
print(f"\nSaved mapping to {out_path}")

# Also create a simple index->id list
index_to_id = [None] * 120
for m in mapping:
    index_to_id[m["stanford_index"]] = m["dogdex_id"]
with open(os.path.join(workspace_dir, "breed_index_to_id.json"), "w") as f:
    json.dump(index_to_id, f, indent=2)
print("Saved breed_index_to_id.json")
