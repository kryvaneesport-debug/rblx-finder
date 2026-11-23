
const BASE = 'https://apis.roblox.com/explore-api/v1'
const GAME_API = 'https://games.roblox.com/v1'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 RBLX-FINDER' },
  })

  if (!response.ok) {
    throw new Error(`Roblox API error: ${response.status}`)
  }

  return response.json()
}

function collectGames(value: any, result = new Map<number, any>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectGames(item, result)
  } else if (value && typeof value === 'object') {
    const id = Number(value.universeId)

    if (Number.isSafeInteger(id) && id > 0) {
      result.set(id, { ...result.get(id), ...value })
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') {
        collectGames(child, result)
      }
    }
  }

  return result
}

function normalizeGenre(value: any, name = '', description = '') {
  const genre = String(value ?? '').toLowerCase()
  const text = `${name} ${description}`.toLowerCase()

  if (
    genre.includes('horror') ||
    /\b(horror|scary|terror|haunted|nightmare)\b/.test(text)
  ) return 'Horror'

  if (
    genre.includes('simulat') ||
    /\b(simulator|tycoon|pet sim|farming|restaurant|business sim)\b/.test(text)
  ) return 'Simulator'

  if (
    genre.includes('fight') ||
    genre.includes('action') ||
    /\b(fighting|battle|combat|pvp|war|shooter|fps|arena)\b/.test(text)
  ) return 'Fighting'

  if (
    genre.includes('roleplay') ||
    /\b(roleplay|role play|rp|brookhaven|adopt me|bloxburg)\b/.test(text)
  ) return 'Roleplay'

  if (
    genre.includes('obby') ||
    /\b(obby|parkour|tower of hell)\b/.test(text)
  ) return 'Obby'

  return 'Other'
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionId = 'rblx-finder-session'

    const sortsData = await getJson(
      `${BASE}/get-sorts?sessionId=${sessionId}&device=computer&country=all`
    )

    const sorts = Array.isArray(sortsData.sorts)
      ? sortsData.sorts
      : []

    const wanted = ['top-playing-now', 'top-trending', 'up-and-coming']

    const selectedSorts = wanted
      .map(id => sorts.find((sort: any) =>
        sort.sortId === id || sort.token === id
      ))
      .filter(Boolean)

    if (!selectedSorts.length) {
      throw new Error('No Roblox discovery categories found')
    }

    const discovered = new Map<number, any>()

    for (const sort of selectedSorts) {
      const sortId = sort.sortId || sort.token

      const content = await getJson(
        `${BASE}/get-sort-content?sessionId=${sessionId}&sortId=${encodeURIComponent(sortId)}&device=computer&country=all&maxRows=100`
      )

      collectGames(content, discovered)
    }

    const ids = [...discovered.keys()].slice(0, 150)

    if (!ids.length) {
      throw new Error('Roblox did not return any games')
    }

    const details: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      const data = await getJson(
        `${GAME_API}/games?universeIds=${batch.join(',')}`
      )

      details.push(...(data.data ?? []))
    }

    const iconData: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      const data = await getJson(
        `${THUMBNAIL_API}/games/icons?universeIds=${batch.join(',')}&size=512x512&format=Png&isCircular=false`
      )

      iconData.push(...(data.data ?? []))
    }

    const icons = new Map(
      iconData.map((item: any) => [item.targetId, item.imageUrl])
    )

    const games = details.map((game: any) => {
      const discoveryInfo = discovered.get(game.id)

      return {
        id: game.id,
        name: game.name,
        description: game.description,
        genre: normalizeGenre(
          discoveryInfo?.genreL1 ??
          discoveryInfo?.genre ??
          game.genre,
          game.name,
          game.description
        ),
        players: game.playing ?? 0,
        visits: game.visits ?? 0,
        maxPlayers: game.maxPlayers ?? 0,
        icon: icons.get(game.id) ?? null,
        url: `https://www.roblox.com/games/${game.rootPlaceId}`,
      }
    })

    games.sort((a: any, b: any) => b.players - a.players)

    res.setHeader(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=300'
    )

    return res.status(200).json({ games })
  } catch (error) {
    console.error('RBLX FINDER:', error)

    return res.status(500).json({
      error: 'Could not load Roblox Discover games.',
    })
  }
}
