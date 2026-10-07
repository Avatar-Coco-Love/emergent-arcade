// The leaderboard identity and its recovery code. There are no accounts: a
// player is this browser's anonymous id (arcade.clientId). The public hash
// `p`, the name tag ("·4F2A") and the typed-name claim all come from it, so
// the id itself is the code a player saves and pastes into another browser.
// New ids are 6 words from WORDS (60 bits); ids made before them (UUIDs)
// keep working as they are. docs/scores.md, "Recovery code".
window.ArcadeIdentity = (function () {
  const store = window.ArcadeUI.store;
  const KEY = "arcade.clientId";
  const SHOWN = "arcade.codeShown";
  const COUNT = 6;
  // 1,024 words, 3–7 letters. Append only: removing a word refuses every
  // code that has it. The order doesn't matter (codes keep the words).
  const WORDS = [
    "able", "acorn", "acrobat", "actor", "admiral", "adobe", "advent",
    "agate", "agile", "airship", "alarm", "album", "alder", "algae", "alley",
    "almond", "aloe", "alpaca", "alpine", "amber", "ample", "amulet",
    "anchor", "angel", "angle", "ankle", "antler", "apex", "apple", "apricot",
    "apron", "aqua", "arbor", "arch", "archer", "arctic", "arena", "argon",
    "aria", "armor", "arrow", "artist", "aspen", "atlas", "atom", "attic",
    "aurora", "autumn", "avenue", "avocado", "awning", "axle", "azure",
    "bacon", "badge", "badger", "bagel", "baker", "bakery", "balcony",
    "ballad", "balloon", "bamboo", "banana", "bandana", "banjo", "banner",
    "barge", "barley", "barn", "barrel", "basil", "basin", "basket", "baton",
    "bay", "bazaar", "beach", "beacon", "beagle", "beak", "beam", "bean",
    "bear", "beaver", "bedrock", "beech", "beet", "beetle", "bell", "bellhop",
    "bench", "berry", "bicycle", "bingo", "birch", "biscuit", "bison",
    "bistro", "blanket", "blaze", "blazer", "blender", "blimp", "blossom",
    "blue", "bluff", "boat", "bobcat", "bobsled", "bold", "bongo", "bonnet",
    "bonsai", "book", "boot", "border", "bottle", "boulder", "bouquet", "bow",
    "bowl", "box", "branch", "brass", "brave", "bread", "breeze", "breezy",
    "brick", "bridge", "bright", "brisk", "brook", "broom", "bubble",
    "bubbly", "bucket", "buckle", "buffalo", "buggy", "bugle", "bundle",
    "bunny", "burrow", "butter", "button", "buzzard", "cabaret", "cabin",
    "cable", "cactus", "caddy", "cadet", "cafe", "cake", "calf", "calico",
    "calm", "camel", "cameo", "camera", "canal", "canary", "candid", "candle",
    "candy", "canoe", "canopy", "canyon", "cape", "capsule", "captain",
    "caramel", "caravan", "cargo", "carpet", "carrot", "cart", "cascade",
    "cashew", "castle", "cat", "catalog", "cavern", "cedar", "celery",
    "cellar", "cello", "cement", "chalet", "chalk", "chamber", "channel",
    "chapel", "chariot", "charm", "cheddar", "cheery", "cheetah", "chef",
    "cherry", "chess", "chick", "chilly", "chime", "chimney", "chirp",
    "chisel", "chorus", "cider", "cinema", "circle", "circus", "citrus",
    "clam", "clay", "clever", "cliff", "clipper", "clock", "cloud", "clover",
    "coast", "cobalt", "cobbler", "cocoa", "coconut", "comet", "comic",
    "compass", "concert", "condor", "cookie", "copper", "coral", "corn",
    "corner", "cosmos", "costume", "cottage", "cotton", "cougar", "cove",
    "coyote", "cozy", "crab", "cracker", "cradle", "crafter", "crane",
    "crater", "crayon", "creek", "crest", "cricket", "crisp", "croquet",
    "crown", "crumb", "crystal", "cub", "cuckoo", "cupcake", "curly",
    "curtain", "cushion", "custard", "cymbal", "dahlia", "daisy", "dancer",
    "daring", "dawn", "decimal", "decoy", "deer", "delight", "delta", "denim",
    "derby", "desert", "dew", "diamond", "diesel", "diner", "dingo", "dinner",
    "diploma", "dipper", "disco", "dish", "divider", "dizzy", "dock",
    "dolphin", "domino", "donkey", "donut", "doodle", "doorway", "dorado",
    "dove", "dragon", "dreamy", "drizzle", "drum", "duck", "dune", "dusk",
    "dust", "dynamo", "eager", "eagle", "early", "easel", "easy", "echo",
    "eclair", "eclipse", "edge", "eel", "egret", "elbow", "elixir", "elk",
    "elm", "ember", "emblem", "emerald", "encore", "engine", "envoy", "epic",
    "equator", "ermine", "escape", "estuary", "fable", "fairway", "falafel",
    "falcon", "fancy", "fanfare", "farmer", "fast", "fawn", "feather",
    "fennel", "fern", "ferry", "fiddle", "fiesta", "fig", "figure", "finch",
    "fjord", "flag", "flame", "flannel", "flint", "flower", "fluffy",
    "flurry", "flute", "foal", "fog", "folio", "forest", "fortune", "fossil",
    "fox", "freckle", "fresco", "frisbee", "frost", "frosty", "fudge",
    "fuzzy", "gadget", "galaxy", "galleon", "gallery", "gander", "garden",
    "garland", "garlic", "garnet", "gateway", "gazebo", "gazelle", "gecko",
    "gentle", "geode", "geyser", "giant", "ginger", "gingham", "giraffe",
    "glacier", "glad", "glade", "glider", "glimmer", "glitter", "globe",
    "glossy", "glove", "gnome", "goat", "goblet", "gold", "golden", "gondola",
    "goose", "gopher", "gorilla", "gourd", "grain", "grand", "granite",
    "granola", "grape", "grass", "gravel", "gravity", "griddle", "griffin",
    "grotto", "grove", "guava", "guitar", "gull", "gumbo", "gumdrop", "gust",
    "habitat", "hallway", "halo", "hamlet", "hammock", "hamster", "happy",
    "harbor", "hardy", "harmony", "harp", "harvest", "hasty", "hatch", "hawk",
    "hazel", "heart", "heather", "hedge", "helix", "helmet", "hemlock",
    "hermit", "heron", "hickory", "highway", "hill", "hilltop", "hippo",
    "hockey", "holiday", "honey", "hoof", "hook", "hoop", "horizon", "horn",
    "hornet", "horse", "hotel", "humble", "husky", "hut", "hydrant", "ibex",
    "ice", "iceberg", "icebox", "icicle", "icon", "igloo", "iguana", "index",
    "inkwell", "inlet", "insect", "iris", "island", "ivory", "ivy", "jackal",
    "jacket", "jade", "jaguar", "jam", "jasmine", "javelin", "jazz", "jelly",
    "jersey", "jet", "jetty", "jewel", "jigsaw", "jingle", "jockey", "jolly",
    "journal", "journey", "jubilee", "judo", "juggler", "juice", "jukebox",
    "jumpy", "jungle", "juniper", "kale", "kayak", "kazoo", "keen", "kelp",
    "kernel", "kettle", "key", "kiln", "kind", "kingdom", "kitchen", "kite",
    "kitten", "kiwi", "knight", "koala", "kumquat", "label", "lace", "ladder",
    "ladle", "lagoon", "lake", "lamb", "lamp", "lantern", "laptop", "lark",
    "lasso", "latch", "laurel", "lava", "lawn", "leaf", "legend", "lemon",
    "lemur", "lentil", "lettuce", "library", "lily", "lime", "linden",
    "linen", "lion", "lively", "lizard", "llama", "lobby", "lobster",
    "locket", "lodge", "lookout", "lotus", "lucky", "luggage", "lullaby",
    "lumber", "lunar", "lute", "lynx", "lyric", "macaw", "magic", "magnet",
    "magpie", "mailbox", "mango", "mantis", "mantle", "maple", "marble",
    "mare", "mariner", "market", "marmot", "marsh", "mascot", "mason",
    "meadow", "medal", "mellow", "melody", "melon", "mermaid", "merry",
    "mesa", "meteor", "mighty", "minnow", "mint", "mirror", "mission",
    "mistral", "misty", "mitten", "moat", "mocha", "modest", "mole", "monkey",
    "monsoon", "moon", "moose", "morning", "mosaic", "moss", "motel", "moth",
    "motor", "muffin", "mural", "museum", "music", "mustang", "mustard",
    "nacho", "napkin", "narwhal", "nebula", "nectar", "needle", "neon",
    "nest", "nickel", "night", "nimble", "noble", "nomad", "noodle", "north",
    "nougat", "nugget", "nutmeg", "oak", "oasis", "oat", "oatmeal", "ocean",
    "ocelot", "octave", "octopus", "odyssey", "olive", "omelet", "omnibus",
    "onion", "opal", "opera", "orange", "orbit", "orca", "orchard", "orchid",
    "organ", "otter", "outpost", "owl", "oxygen", "oyster", "paddle",
    "paddock", "pagoda", "palace", "palm", "pancake", "panda", "pansy",
    "panther", "papaya", "paper", "parade", "parasol", "parcel", "parrot",
    "parsley", "pasta", "pastel", "pathway", "peach", "peacock", "peanut",
    "pear", "pebble", "pecan", "pelican", "penguin", "pennant", "pepper",
    "perch", "perky", "pewter", "pharaoh", "phoenix", "piano", "pickle",
    "picnic", "pigeon", "pillow", "pilot", "pine", "pinto", "pioneer",
    "pirate", "pitcher", "pixel", "pizza", "planet", "plateau", "plaza",
    "plucky", "plum", "plume", "pocket", "poem", "polaris", "polite", "polka",
    "pompom", "pond", "pony", "poodle", "popcorn", "poppy", "porch", "potato",
    "potion", "pottery", "prairie", "pretzel", "prism", "proud", "pudding",
    "puffin", "pulsar", "pumpkin", "puppet", "puppy", "puzzle", "quail",
    "quarry", "quartz", "quasar", "quest", "quiche", "quick", "quiet",
    "quill", "quilt", "quince", "quiver", "rabbit", "raccoon", "radar",
    "radio", "radish", "raft", "rain", "rainbow", "raisin", "ramble",
    "rambler", "ranch", "rapid", "rapids", "raven", "ravine", "recital",
    "redwood", "reef", "regatta", "relay", "reptile", "ribbon", "rice",
    "riddle", "ridge", "ringlet", "river", "robin", "robot", "rocket",
    "rodeo", "roof", "rooster", "rose", "rosebud", "rosy", "rotunda", "royal",
    "ruby", "rudder", "rug", "rustic", "saddle", "safari", "saffron", "sage",
    "sail", "salmon", "sampler", "sand", "sandal", "sandbar", "sandy",
    "satchel", "satin", "saturn", "sauce", "sausage", "savanna", "scarf",
    "scholar", "school", "scooter", "scroll", "seal", "seed", "sequoia",
    "shadow", "shark", "shell", "sherbet", "sheriff", "shiny", "shore",
    "shrimp", "shuttle", "signal", "silent", "silk", "silly", "silver",
    "siren", "skate", "skyline", "sled", "sleepy", "slipper", "sloth",
    "smooth", "snail", "snappy", "snow", "snowman", "snowy", "sofa", "soft",
    "solid", "sonnet", "sorbet", "souffle", "spaniel", "sparkle", "sparkly",
    "sparrow", "speedy", "spice", "spicy", "spider", "spinach", "spindle",
    "spinner", "spoon", "spring", "spruce", "squash", "squid", "stadium",
    "star", "station", "statue", "steady", "steam", "stencil", "stirrup",
    "stone", "stork", "storm", "stream", "strudel", "sturdy", "sugar",
    "summit", "sun", "sundial", "sunny", "sunrise", "sunset", "super",
    "surfer", "swallow", "swan", "sweater", "sweet", "swift", "syrup", "taco",
    "tadpole", "tango", "tapir", "teacup", "teapot", "temple", "tent",
    "terrace", "thimble", "thistle", "thunder", "tiara", "tidy", "tiger",
    "timber", "tiny", "toast", "tofu", "tomato", "topaz", "torch", "tornado",
    "toucan", "tower", "trail", "train", "trellis", "trinket", "trolley",
    "trophy", "trout", "truffle", "trumpet", "trusty", "tugboat", "tulip",
    "tumbler", "tuna", "tundra", "tunnel", "turbine", "turkey", "turnip",
    "turtle", "tuxedo", "twig", "typhoon", "ukulele", "unicorn", "unison",
    "upland", "urchin", "valet", "valley", "vanilla", "vapor", "vault",
    "velvet", "veranda", "vessel", "viking", "village", "violet", "violin",
    "viper", "visor", "vivid", "volcano", "voyage", "voyager", "vulture",
    "waffle", "wagon", "walkway", "walnut", "walrus", "wand", "warbler",
    "warm", "wasp", "water", "wave", "wavy", "wax", "weasel", "weaver",
    "whale", "wheat", "wheel", "whisker", "whistle", "wigwam", "willow",
    "window", "winter", "wise", "witty", "wizard", "wolf", "wombat", "wren",
    "yacht",
  ];
  const INDEX = new Set(WORDS);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  // Browsers without crypto.randomUUID got digits from Math.random.
  const DIGITS = /^\d{6,20}$/;

  function generate() {
    const n = new Uint16Array(COUNT);
    try { crypto.getRandomValues(n); } catch (_) { n.forEach((_, i) => (n[i] = Math.random() * 65536)); }
    return Array.from(n, (x) => WORDS[x % WORDS.length]).join("-");
  }

  // A pasted or typed code -> { ok, id } or { ok: false, message }.
  // Spaces, commas, capitals and extra hyphens between words are fine.
  function parse(text) {
    const raw = String(text || "").trim().toLowerCase();
    if (!raw) return { ok: false, message: "Paste or type your code first." };
    if (UUID.test(raw) || DIGITS.test(raw)) return { ok: true, id: raw };
    const words = raw.split(/[^a-z0-9]+/).filter(Boolean);
    if (!words.length || words.some((w) => /\d/.test(w))) return { ok: false, message: "That isn't a leaderboard code. A code is 6 words, or a long code of letters, digits and dashes." };
    const unknown = words.find((w) => !INDEX.has(w));
    if (unknown) return { ok: false, message: `“${unknown}” isn't one of the code words. Check the spelling.` };
    if (words.length !== COUNT) return { ok: false, message: `A code has ${COUNT} words; this one has ${words.length}.` };
    return { ok: true, id: words.join("-") };
  }

  const current = () => window.ArcadeFeedback.clientId();
  const pFor = (id) => window.ArcadeScores.hash(`player:${id}`);

  // What the published leaderboards.json knows about an id: its typed name
  // claim and its random name (from the claim, else from a board entry).
  function published(data, id) {
    const Scores = window.ArcadeScores;
    const p = pFor(id);
    const claim = data && data.names && data.names[p];
    let handle = claim && Scores.isHandle(claim.r) ? claim.r : "";
    for (const g of Object.values((data && data.games) || {})) {
      for (const list of Object.values((g && g.boards) || {})) {
        for (const e of Array.isArray(list) ? list : []) {
          if (!handle && e && e.p === p) handle = [e.r, e.h].find((h) => Scores.isHandle(h)) || "";
        }
      }
    }
    return { name: claim && typeof claim.n === "string" ? window.ArcadeNames.clean(claim.n) : "", handle };
  }

  // Switches this browser to another identity. Achievements, bests and
  // daily results stay (they're this browser's); the name and random name
  // become the given ones, or the id's defaults. The caller reloads.
  function use(id, fields) {
    const f = fields || {};
    store.set(KEY, id);
    if (f.name) store.set("arcade.name", window.ArcadeNames.clean(f.name).slice(0, 32));
    else store.remove("arcade.name");
    if (window.ArcadeScores.isHandle(f.handle)) store.set("arcade.handle", f.handle);
    else store.remove("arcade.handle");
    store.set(SHOWN, "1");
  }

  // The export file's optional block ("Include my leaderboard identity").
  function exportBlock() {
    const out = { clientId: current() };
    const name = window.ArcadeScores.typedName();
    if (name) out.name = name;
    const handle = store.get("arcade.handle");
    if (window.ArcadeScores.isHandle(handle)) out.handle = handle;
    return out;
  }

  // An imported file's block -> { id, name, handle } or null.
  function fromExport(raw) {
    if (!raw || typeof raw !== "object") return null;
    const got = parse(raw.clientId);
    if (!got.ok) return null;
    const name = typeof raw.name === "string" ? window.ArcadeNames.clean(raw.name).slice(0, 32) : "";
    return { id: got.id, name, handle: window.ArcadeScores.isHandle(raw.handle) ? raw.handle : "" };
  }

  // How an identity shows on the board: "Coco ·4F2A", else its random name.
  function shownAs(f) {
    if (f.name) return window.ArcadeNames.display(f.name, pFor(f.id));
    return f.handle || window.ArcadeScores.defaultHandle(f.id);
  }

  // Whether this browser's player has seen their code (the callout after a
  // typed name is offered until then). Cleared with a new id.
  const shown = () => store.get(SHOWN) === "1";
  const markShown = () => store.set(SHOWN, "1");
  const forget = () => store.remove(SHOWN);

  return { WORDS, COUNT, generate, parse, current, pFor, published, use, exportBlock, fromExport, shownAs, shown, markShown, forget };
})();
