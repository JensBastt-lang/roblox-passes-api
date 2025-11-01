export default async function handler(req, res) {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ error: "Missing userid" });
  }

  try {
    const response = await fetch(
      `https://inventory.roblox.com/v1/users/${userid}/items/GamePass?limit=100`
    );
    const data = await response.json();

    const passes = (data?.data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: p.product?.priceInRobux ?? 0
    }));

    return res.status(200).json(passes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch passes" });
  }
}
