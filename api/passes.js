export default async function handler(request, response) {
  const { userid } = request.query;

  if (!userid) {
    return response.status(400).json({ error: "Missing userid parameter" });
  }

  try {
    const res = await fetch(`https://inventory.roblox.com/v1/users/${userid}/items/GamePass`);
    const data = await res.json();

    const passes = data?.data?.map(pass => ({
      id: pass.id,
      name: pass.name,
      price: pass.product?.priceInRobux ?? 0
    })) ?? [];

    return response.status(200).json(passes);
  } catch (err) {
    return response.status(500).json({ error: "Failed to fetch game passes" });
  }
}
