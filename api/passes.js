export default async function handler(request, response) {
  const { gameid } = request.query;

  if (!gameid) {
    return response.status(400).json({ error: "Missing gameid parameter" });
  }

  try {
    const res = await fetch(`https://games.roblox.com/v1/games/${gameid}/game-passes`);
    const data = await res.json();

    const passes = data?.data?.map(pass => ({
      id: pass.id,
      name: pass.name,
      price: pass.price ?? pass.product?.priceInRobux ?? 0,
      type: "GamePass"
    })) ?? [];

    return response.status(200).json(passes);
  } catch (err) {
    console.error(err);
    return response.status(500).json({ error: "Failed to fetch game passes" });
  }
}
