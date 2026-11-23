
const games = [
  { id: 994732206, genre: 'Fighting' },
  { id: 4924922222, genre: 'Roleplay' },
  { id: 2440500124, genre: 'Horror' },
  { id: 920587237, genre: 'Simulator' },
  { id: 111958650, genre: 'Fighting' },
  { id: 15101393044, genre: 'Simulator' },
  { id: 142823291, genre: 'Horror' },
  { id: 1962086868, genre: 'Obby' },
]

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const ids = games.map(game => game.id).join(',')

    const [gamesResponse, iconsResponse] = await Promise.all([
      fetch(`https://games.roblox.com/v1/games?universeIds=${ids}`),
      fetch(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&size=512x512&format=Png&isCircular=false`
      ),
    ])

    if (!gamesResponse.ok || !iconsResponse.ok) {
      throw new Error('Roblox API request failed')
    }

    const gamesData = await gamesResponse.json()
    const iconsData = await iconsResponse.json()

    const icons = new Map(
      iconsData.data.map((icon: any) => [icon.targetId, icon.imageUrl])
    )

    const result = gamesData.data.map((game: any) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      genre: games.find(item => item.id === game.id)?.genre ?? 'Other',
      players: game.playing,
      visits: game.visits,
      maxPlayers: game.maxPlayers,
      rootPlaceId: game.rootPlaceId,
      icon: icons.get(game.id) ?? null,
      url: `https://www.roblox.com/games/${game.rootPlaceId}`,
    }))

    res.setHeader(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=300'
    )

    return res.status(200).json({ games: result })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: 'Nepodařilo se načíst hry z Robloxu.',
    })
  }
}
