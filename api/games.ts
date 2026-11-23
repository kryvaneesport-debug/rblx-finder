
const BASE = 'https://apis.roblox.com/explore-api/v1'
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
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

function normalizeGenres(value: any, name = '', description = '') {
  const genre = String(value ?? '').toLowerCase()
  const text = `${name} ${description}`.toLowerCase()
  const genres: string[] = []

  const matches = (pattern: RegExp) => pattern.test(text)

  if (
    genre.includes('horror') ||
    matches(/\b(horror|scary|terror|haunted|nightmare|creepy)\b/)
  ) genres.push('Horror')

  if (
    genre.includes('simulat') ||
    matches(/\b(simulator|tycoon|pet sim|farming|restaurant|business sim)\b/)
  ) genres.push('Simulator')

  if (
    genre.includes('fight') ||
    genre.includes('action') ||
    matches(/\b(fighting|battle|combat|pvp|war|shooter|fps|arena|boxing)\b/)
  ) genres.push('Fighting')

  if (
    genre.includes('roleplay') ||
    matches(/\b(roleplay|role play|brookhaven|adopt me|bloxburg)\b/)
  ) genres.push('Roleplay')

  if (
    genre.includes('obby') ||
    matches(/\b(obby|parkour|tower of hell)\b/)
  ) genres.push('Obby')

  if (
    matches(/\b(survival|survive|zombie|apocalypse|disaster|last alive)\b/)
  ) genres.push('Survival')

  if (
    matches(/\b(anime|naruto|one piece|dragon ball|bleach|jujutsu|demon slayer)\b/)
  ) genres.push('Anime')

  if (
    matches(/\b(racing|race|driving|car simulator|drift|speedway)\b/)
  ) genres.push('Racing')

  if (
    matches(/\b(sports|football|soccer|basketball|volleyball|tennis)\b/)
  ) genres.push('Sports')

  if (
    matches(/\b(adventure|quest|explore|dungeon|open world)\b/)
  ) genres.push('Adventure')

  return genres.length > 0 ? [...new Set(genres)] : ['Other']
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionId = 'rblx-finder-session'
    const discovered = new Map<number, any>()

    // 1. Roblox Discover categories
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

    for (const sort of selectedSorts) {
      const sortId = sort.sortId || sort.token

      const content = await getJson(
        `${BASE}/get-sort-content?sessionId=${sessionId}&sortId=${encodeURIComponent(sortId)}&device=computer&country=all&maxRows=100`
      )

      collectGames(content, discovered)
    }

    // 2. Search for more Roblox games
    const searchTerms = [
      'The Mimic',
      'Doors',
      'Pressure',
      'Apeirophobia',
      'horror',
      'survival',
      'anime',
      'simulator',
      'roleplay',
      'obby',
      'racing',
      'adventure',
    ]

    for (const term of searchTerms) {
      try {
        const params = new URLSearchParams({
          searchQuery: term,
          sessionId,
          pageType: 'all',
        })

        const searchData = await getJson(
          `${SEARCH_API}/omni-search?${params.toString()}`
        )

        collectGames(searchData, discovered)
      } catch (error) {
        console.error(`Search failed for ${term}:`, error)
      }
    }

    // 3. Collect discovered game IDs
    const ids = [...discovered.keys()].slice(0, 300)

    if (!ids.length) {
      throw new Error('Roblox did not return any games')
    }

    // 4. Load game details
    const details: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      const data = await getJson(
        `${GAME_API}/games?universeIds=${batch.join(',')}`
      )

      details.push(...(data.data ?? []))
    }

    // 5. Load game icons
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

    // 6. Prepare final game list
    const games = details.map((game: any) => {
      const discoveryInfo = discovered.get(game.id)

      return {
        id: game.id,
        name: game.name,
        description: game.description,
        genres: normalizeGenres(
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
      's-maxage=300, stale-while-revalidate=600'
    )

    return res.status(200).json({ games })
  } catch (error) {
    console.error('RBLX FINDER:', error)

    return res.status(500).json({
      error: 'Could not load Roblox Discover games.',
    })
  }
}
