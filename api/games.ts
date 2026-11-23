
const BASE = 'https://apis.roblox.com/explore-api/v1'
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
const GAME_API = 'https://games.roblox.com/v1'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

const FEATURED_GAMES = new Map<number, string>([
  [2294168059, 'Horror'], // The Mimic
])

const SEARCH_TERMS = [
  'The Mimic',
  'Doors',
  'Pressure',
  'Apeirophobia',
  'horror games',
  'survival games',
  'anime games',
  'simulator games',
  'roleplay games',
  'obby games',
  'racing games',
  'adventure games',
  'popular Roblox games',
  'fighting games',
]

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
    matches(/\b(horror|scary|terror|haunted|nightmare|creepy|mimic|doors|pressure|apeirophobia)\b/)
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

async function searchRoblox(
  term: string,
  discovered: Map<number, any>
) {
  let pageToken = ''

  // Maximum two pages for each search term
  for (let page = 0; page < 2; page++) {
    const params = new URLSearchParams({
      searchQuery: term,
      sessionId: 'rblx-finder-session',
      pageType: 'all',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    try {
      const data = await getJson(
        `${SEARCH_API}/omni-search?${params.toString()}`
      )

      collectGames(data, discovered)

      pageToken = data.nextPageToken

      if (!pageToken) break
    } catch (error) {
      console.error(`Search failed: ${term}`, error)
      break
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const discovered = new Map<number, any>()

    // 1. Add selected known games directly
    for (const [id, genre] of FEATURED_GAMES) {
      discovered.set(id, {
        universeId: id,
        genreL1: genre,
      })
    }

    // 2. Load Roblox Discover categories
    const sortsData = await getJson(
      `${BASE}/get-sorts?sessionId=rblx-finder-session&device=computer&country=all`
    )

    const sorts = Array.isArray(sortsData.sorts)
      ? sortsData.sorts
      : []

    const wanted = [
      'top-playing-now',
      'top-trending',
      'up-and-coming',
    ]

    const selectedSorts = wanted
      .map(id =>
        sorts.find((sort: any) =>
          sort.sortId === id || sort.token === id
        )
      )
      .filter(Boolean)

    for (const sort of selectedSorts) {
      const sortId = sort.sortId || sort.token

      const content = await getJson(
        `${BASE}/get-sort-content?sessionId=rblx-finder-session&sortId=${encodeURIComponent(sortId)}&device=computer&country=all&maxRows=100`
      )

      collectGames(content, discovered)
    }

    // 3. Search for additional games
    // Four searches at a time to avoid excessive requests
    for (let i = 0; i < SEARCH_TERMS.length; i += 4) {
      const batch = SEARCH_TERMS.slice(i, i + 4)

      await Promise.all(
        batch.map(term => searchRoblox(term, discovered))
      )
    }

    // 4. Load up to 300 unique games
    const ids = [...discovered.keys()].slice(0, 300)

    if (!ids.length) {
      throw new Error('Roblox did not return any games')
    }

    // 5. Load game details
    const details: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      const data = await getJson(
        `${GAME_API}/games?universeIds=${batch.join(',')}`
      )

      details.push(...(data.data ?? []))
    }

    // 6. Load game icons
    const iconData: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      const data = await getJson(
        `${THUMBNAIL_API}/games/icons?universeIds=${batch.join(',')}&size=512x512&format=Png&isCircular=false`
      )

      iconData.push(...(data.data ?? []))
    }

    const icons = new Map(
      iconData.map((item: any) => [
        item.targetId,
        item.imageUrl,
      ])
    )

    // 7. Prepare games and apply player threshold
    const games = details
      .filter((game: any) =>
        (game.playing ?? 0) >= 500 ||
        FEATURED_GAMES.has(game.id)
      )
      .map((game: any) => {
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
      's-maxage=120, stale-while-revalidate=300'
    )

    return res.status(200).json({
      total: games.length,
      minimumPlayers: 500,
      games,
    })
  } catch (error) {
    console.error('RBLX FINDER:', error)

    return res.status(500).json({
      error: 'Could not load Roblox games.',
    })
  }
}
