// Topic tags: the one fixed list a game's optional manifest "topics" (1-3
// ids) is checked against, so there are no free-form tags or near-duplicates.
// Two kinds: a "subject" is the field the game's rules come from; a "skill"
// is what the game is about doing. A game gets a tag only when its core
// mechanics really use it (docs/adding-a-game.md, "Topics").
//
// The gallery shows the topic chips (?topic=<id>), searches the labels and
// lists a game's topics in the cabinet's ⓘ panel. Also loaded by the Node
// scripts through scripts/topics.mjs (validate, mechanic map).
window.ArcadeTopics = (function () {
  // Subjects first, then skills; each kind in the order the chips show.
  // "about" is the test for the tag (and the chip's tooltip). Every tag needs
  // a game, except one marked "planned" (a game for it is next); the gallery
  // hides chips no game uses.
  const LIST = [
    { id: "mechanics", kind: "subject", label: "mechanics", about: "Forces, gravity, friction and motion decide the outcome." },
    { id: "fluid-dynamics", kind: "subject", label: "fluid dynamics", about: "Water that flows, sloshes, pools and finds its level." },
    { id: "granular-matter", kind: "subject", label: "granular matter", about: "Sand that falls, piles, packs and avalanches." },
    { id: "thermodynamics", kind: "subject", label: "thermodynamics", about: "Heat that spreads, radiates away and changes the material." },
    { id: "ecology", kind: "subject", label: "ecology", about: "Populations that eat, breed, starve and move." },
    { id: "collective-behaviour", kind: "subject", label: "collective behaviour", about: "Many simple agents whose shared signals make the group's behaviour." },
    { id: "contagion", kind: "subject", label: "contagion", about: "Something that spreads from neighbour to neighbour: fire, fear." },
    { id: "information-theory", kind: "subject", label: "information theory", about: "Each action is a question; how much its answer can tell you is the puzzle." },
    { id: "planning", kind: "skill", label: "planning", about: "Working out a sequence of moves ahead, under a budget." },
    { id: "deduction", kind: "skill", label: "deduction", about: "Proving the answer from what you have observed." },
    { id: "timing", kind: "skill", label: "timing", about: "Acting at the right moment in a system that keeps moving." },
    { id: "spatial-reasoning", kind: "skill", label: "spatial reasoning", about: "Picturing where things go when the whole space turns." },
    { id: "working-memory", kind: "skill", label: "working memory", about: "Keeping what you have seen in mind, because the game doesn't show it again.", planned: true },
  ];
  const BY_ID = new Map(LIST.map((t) => [t.id, t]));
  const KINDS = ["subject", "skill"];

  const get = (id) => BY_ID.get(id) || null;
  // A game's topics, known ones only, in list order.
  const of = (g) => LIST.filter((t) => (g.topics || []).includes(t.id));

  return { LIST, KINDS, get, of };
})();
