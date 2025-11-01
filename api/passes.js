export default async function handler(req, res) {
  const { userid } = req.query;
  if (!userid) return res.status(400).json({ error: "Missing userid" });

  try {
    // ✅ 1. Haal ALLE passes van de speler rechtstreeks uit Roblox Inventory
    const inventoryRes = await fetch(
      `https://inventory.roblox.com/v1/users/${userid}/items/GamePass?limit=100`
    );
    const inventoryData = await inventoryRes.json();

    let passes = [];

    if (inventoryData.data && inventoryData.data.length > 0) {
      for (const item of inventoryData.data) {
        passes.push({
          id: item.item.id,
          name: item.item.name,
          price: item.product?.priceInRobux || 0
        });
      }
    }

    // ✅ 2. Als Inventory leeg is, fallback naar games endpoint
    if (passes.length === 0) {
      const gamesRes = await fetch(
        `https://games.roblox.com/v2/users/${userid}/games?accessFilter=Public`
      );
      const gamesData = await gamesRes.json();

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
            game: game.name
          });
        }
      }
    }

    return res.status(200).json({ success: true, passes });
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
