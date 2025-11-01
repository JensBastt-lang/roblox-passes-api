export default async function handler(req, res) {
  try {
    const { userid, universeid } = req.query;
    if (!userid || !universeid) {
      return res.status(400).json({ error: "Missing userid or universeid" });
    }

    // Haal alle gamepasses van de gebruiker op (via economy API)
    const passesRes = await fetch(`https://games.roblox.com/v1/users/${userid}/game-passes?sortOrder=Asc&limit=100`);
    if (!passesRes.ok) {
      return res.status(passesRes.status).json({ error: `Roblox API error: ${passesRes.status}` });
    }
    const passesData = await passesRes.json();

    // Filter enkel passes die bij jouw universe horen
    const filtered = passesData.data.filter(pass => pass.universeId == universeid);

    res.status(200).json({
      success: true,
      total: filtered.length,
      passes: filtered.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price ?? 0
      }))
    });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
