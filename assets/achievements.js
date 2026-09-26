// Achievements. Each game lists its achievements in games/games.json; the game
// itself only announces unlocks with
//   parent.postMessage({ type: "arcade:achievement", game: "<id>", id: "<achievement id>" }, "*")
// and the gallery records them per browser in localStorage.
window.ArcadeAchievements = (function () {
  function key(gameId) {
    return `arcade.achievements.${gameId}`;
  }

  // -> { [achievementId]: ISO date unlocked }
  function load(gameId) {
    try {
      return JSON.parse(localStorage.getItem(key(gameId))) || {};
    } catch (_) {
      return {};
    }
  }

  // Returns true when this is a new unlock.
  function unlock(game, achievementId) {
    const known = (game.achievements || []).some((a) => a.id === achievementId);
    if (!known) return false;
    const got = load(game.id);
    if (got[achievementId]) return false;
    got[achievementId] = new Date().toISOString();
    try {
      localStorage.setItem(key(game.id), JSON.stringify(got));
    } catch (_) {}
    return true;
  }

  // Unlocks that still exist in the manifest (a revision may remove some).
  function count(game) {
    const got = load(game.id);
    return (game.achievements || []).filter((a) => got[a.id]).length;
  }

  return { load, unlock, count };
})();
