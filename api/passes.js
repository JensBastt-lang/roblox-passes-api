export default async function handler(req, res) {
  const { userid } = req.query;

  if (!userid) return res.status(400).json({ error: "Missing userid" });

  try {
    // Alle games van de gebruiker ophalen
    const gamesRes = await fetch(`https://games.roblox.com/v2/users/${userid}/games?accessFilter=Public&limit=10`);
    const gamesData = await gamesRes.json();

    let passes = [];

    for (const game of gamesData.data || []) {
      const universeId = game.id;
      const passesRes = await fetch(`https://games.roblox.com/v1/universes/${universeId}/game-passes?limit=50`);
      const passesData = await passesRes.json();

      for (const p of passesData.data || []) {
        passes.push({
          id: p.id,
          name: p.name,
          price: p.price ?? p.product?.priceInRobux ?? 0,
          type: "GamePass",
          gameName: game.name
        });
      }
    }

    return res.status(200).json(passes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user passes" });
  }
}
