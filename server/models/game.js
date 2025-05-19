// Game Model: manages state and logic

const rooms = new Map();
const wordLists = {
  easy: [
    "dog",
    "cat",
    "house",
    "tree",
    "car",
    "sun",
    "moon",
    "fish",
    "bird",
    "book",
  ],
  medium: [
    "elephant",
    "computer",
    "bicycle",
    "airplane",
    "mountain",
    "rainbow",
    "guitar",
    "pizza",
    "castle",
    "rocket",
  ],
  hard: [
    "skyscraper",
    "astronaut",
    "submarine",
    "dinosaur",
    "waterfall",
    "lighthouse",
    "volcano",
    "orchestra",
    "kangaroo",
    "helicopter",
  ],
};

function getRandomWords(count = 3) {
  const allWords = [...wordLists.easy, ...wordLists.medium, ...wordLists.hard];
  const words = [];
  if (allWords.length < count) {
    console.error("Not enough words available");
    return allWords;
  }
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * allWords.length);
    words.push(allWords[randomIndex]);
    allWords.splice(randomIndex, 1);
  }
  return words;
}

function selectDrawer(room) {
  const playerIds = Array.from(room.players.keys());
  if (playerIds.length === 0) return null;
  const nextDrawerIndex = (room.currentRound - 1) % playerIds.length;
  const nextDrawerId = playerIds[nextDrawerIndex];
  room.players.forEach((player, id) => {
    player.isDrawing = id === nextDrawerId;
  });
  return nextDrawerId;
}

module.exports = {
  rooms,
  wordLists,
  getRandomWords,
  selectDrawer,
};
