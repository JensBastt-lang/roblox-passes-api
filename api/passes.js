export default async function handler(req, res) {
  const { userid } = req.query;
  if (!userid) return res.status(400).json({ error: "Missing userid" });

  try {
    // alle public games ophalen
    const gamesRes = await fetch(
      `https://games.roblox.com/v2/users/${userid}/games?accessFilter=Public`
    );
    const gamesData = await gamesRes.json();

    let passes = [];

    // voor elke game de gamepasses ophalen
    for (const game of gamesData.data || []) {
      const passRes = await fetch(
        `https://games.roblox.com/v1/games/${game.id}/game-passes`
      );
      const passData = await passRes.json();

      for (const pass of passData.data || []) {
        passes.push({
          id: pass.id,
          name: pass.name,
          price: pass.price,
          game: game.name,
        });
      }
    }

    return res.status(200).json({ success: true, passes });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
