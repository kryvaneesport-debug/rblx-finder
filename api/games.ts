
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
const GAME_API = 'https://games.roblox.com/v1'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

const MAX_GAMES = 250
const SEARCH_CONCURRENCY = 10
const REQUEST_TIMEOUT = 5000

const SEARCH_TERMS = [
  // Popular games
  'Blox Fruits',
  'Brookhaven',
  'Adopt Me',
  'Grow a Garden',
  'Dress to Impress',
  'RIVALS',
  'Murder Mystery 2',
  'Doors',
  'The Mimic',
  'Piggy',
  'Evade',
  'Pressure',
  'Apeirophobia',
  'Rainbow Friends',
  'Fisch',
  'Dandy World',
  'Pet Simulator 99',
  'Blade Ball',
  'Arsenal',
  'Jailbreak',
  'BedWars',
  'Royale High',
  'Tower of Hell',
  'Natural Disaster Survival',
  '3008',
  'Flee the Facility',
  'Shindo Life',
  'King Legacy',
  'Anime Adventures',
  'Bee Swarm Simulator',

  // Discover by genre
  'Roblox horror games',
  'Roblox survival games',
  'Roblox simulator games',
  'Roblox tycoon games',
  'Roblox roleplay games',
  'Roblox anime games',
  'Roblox fighting games',
  'Roblox adventure games',
  'Roblox obby games',
  'Roblox racing games',
  'Roblox funny games',
  'Roblox story games',
  'Roblox military games',
  'Roblox football games',
  'Roblox building games',
  'Roblox open world games',
  'Roblox escape games',
  'Roblox zombie games',
  'Roblox parkour games',
  'Roblox mystery games',
]

function normalizeName(name: string) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getJson(url: string, retries = 1): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    )

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 RBLX-FINDER',
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `Roblox API ${response.status}: ${new URL(url).pathname}`
        )
      }

      return await response.json()
    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error(String(error))

      if (attempt < retries) {
        await delay(300)
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError ?? new Error('Roblox API request failed')
}

function collectGames(
  value: any,
  result = new Map<number, any>()
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectGames(item, result)
    }

    return result
  }

  if (!value || typeof value !== 'object') {
    return result
  }

  const id = Number(value.universeId)

  if (
    Number.isSafeInteger(id) &&
    id > 0
  ) {
    result.set(id, {
      ...result.get(id),
      ...value,
      universeId: id,
    })
  }

  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      collectGames(child, result)
    }
  }

  return result
}

function getGenre(name: string, genre = '') {
  const text = normalizeName(name)
  const sourceGenre = String(genre).toLowerCase()
  const genres: string[] = []

  if (
    sourceGenre.includes('horror') ||
    /\b(piggy|mimic|doors|pressure|evade|apeirophobia|rainbow friends|dandy world)\b/.test(text)
  ) genres.push('Horror')

  if (
    sourceGenre.includes('simulat') ||
    /\b(simulator|tycoon|farming|bee swarm|grow a garden|pet simulator|fisch)\b/.test(text)
  ) genres.push('Simulator')

  if (
    sourceGenre.includes('fight') ||
    /\b(rivals|arsenal|blade ball|battlegrounds|combat|fighting)\b/.test(text)
  ) genres.push('Fighting')

  if (
    /\b(roleplay|brookhaven|adopt me|meepcity|royale high)\b/.test(text)
  ) genres.push('Roleplay')

  if (
    /\b(obby|parkour|tower of hell|escape)\b/.test(text)
  ) genres.push('Obby')

  if (
    /\b(survival|survive|zombie|disaster|3008)\b/.test(text)
  ) genres.push('Survival')

  if (
    /\b(anime|naruto|one piece|dragon ball|bleach|jujutsu|demon slayer|shindo life)\b/.test(text)
  ) genres.push('Anime')

  if (
    /\b(racing|race|driving|drift|vehicle|car)\b/.test(text)
  ) genres.push('Racing')

  if (
    /\b(sports|football|soccer|basketball|volleyball|tennis|bedwars)\b/.test(text)
  ) genres.push('Sports')

  if (
    /\b(adventure|quest|explore|dungeon|open world|story)\b/.test(text)
  ) genres.push('Adventure')

  return genres.length
    ? [...new Set(genres)]
    : ['Other']
}

async function searchRoblox(term: string) {
  const params = new URLSearchParams({
    searchQuery: term,
    sessionId: 'rblx-finder',
    pageType: 'all',
  })

  try {
    const data = await getJson(
      `${SEARCH_API}?${params.toString()}`,
      0
    )

    return [...collectGames(data).values()]
      .filter(game => {
        const name = String(
          game.name ?? game.universeName ?? ''
        )

        return (
          name.trim().length > 0 &&
          Number(game.universeId) > 0
        )
      })
  } catch (error) {
    console.error(`Search failed for "${term}":`, error)
    return []
  }
}

async function runInBatches<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batch.map(callback)
    )

    results.push(...batchResults)
  }

  return results
}

async function loadSearches() {
  const discovered = new Map<number, any>()

  const results = await runInBatches(
    SEARCH_TERMS,
    SEARCH_CONCURRENCY,
    searchRoblox
  )

  for (const games of results) {
    for (const game of games) {
      const id = Number(game.universeId)

      discovered.set(id, {
        ...discovered.get(id),
        ...game,
      })
    }
  }

  return discovered
}

function formatGame(game: any, icon: string | null = null) {
  const id = Number(game.id ?? game.universeId)

  const name = String(
    game.name ?? game.universeName ?? ''
  )

  const rootPlaceId = Number(
    game.rootPlaceId ??
    game.placeId ??
    game.rootPlace?.id
  )

  const players = Number(
    game.playing ??
    game.playerCount ??
    game.playingCount ??
    game.concurrentPlayers ??
    0
  )

  const visits = Number(
    game.visits ??
    game.visitCount ??
    0
  )

  return {
    id,
    name,
    description: String(game.description ?? ''),
    genres: getGenre(
      name,
      game.genreL1 ?? game.genre ?? ''
    ),
    players: Number.isFinite(players) ? players : 0,
    visits: Number.isFinite(visits) ? visits : 0,
    maxPlayers: Number(game.maxPlayers ?? 0),
    icon,
    url: Number.isFinite(rootPlaceId) && rootPlaceId > 0
      ? `https://www.roblox.com/games/${rootPlaceId}`
      : `https://www.roblox.com/discover/?Keyword=${encodeURIComponent(name)}`,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  try {
    // 1. Discover games through Roblox search.
    const discovered = await loadSearches()

    if (discovered.size === 0) {
      throw new Error(
        'Roblox search returned no games.'
      )
    }

    const candidates = [...discovered.values()]
      .slice(0, MAX_GAMES)

    const ids = candidates
      .map(game => Number(game.universeId))
      .filter(id =>
        Number.isSafeInteger(id) && id > 0
      )

    // 2. Load game statistics in batches.
    const detailBatches: number[][] = []

    for (let i = 0; i < ids.length; i += 50) {
      detailBatches.push(ids.slice(i, i + 50))
    }

    const detailResults = await Promise.all(
      detailBatches.map(async batch => {
        try {
          const data = await getJson(
            `${GAME_API}/games?universeIds=${batch.join(',')}`,
            0
          )

          return data.data ?? []
        } catch (error) {
          console.error('Game details unavailable:', error)
          return []
        }
      })
    )

    const detailMap = new Map<number, any>()

    for (const batch of detailResults) {
      for (const game of batch) {
        detailMap.set(Number(game.id), game)
      }
    }

    // 3. Merge search results and game statistics.
    const mergedGames = candidates.map(candidate => ({
      ...candidate,
      ...(detailMap.get(Number(candidate.universeId)) ?? {}),
    }))

    // 4. Load game icons.
    const iconBatches: number[][] = []

    for (let i = 0; i < ids.length; i += 50) {
      iconBatches.push(ids.slice(i, i + 50))
    }

    const iconResults = await Promise.all(
      iconBatches.map(async batch => {
        try {
          const data = await getJson(
            `${THUMBNAIL_API}/games/icons?universeIds=${batch.join(',')}&size=512x512&format=Png&isCircular=false`,
            0
          )

          return data.data ?? []
        } catch (error) {
          console.error('Thumbnails unavailable:', error)
          return []
        }
      })
    )

    const iconMap = new Map<number, string>()

    for (const batch of iconResults) {
      for (const item of batch) {
        if (item.targetId && item.imageUrl) {
          iconMap.set(
            Number(item.targetId),
            item.imageUrl
          )
        }
      }
    }

    // 5. Format, remove duplicates and sort.
    const uniqueGames = new Map<number, any>()

    for (const game of mergedGames) {
      const id = Number(game.id ?? game.universeId)

      if (!Number.isSafeInteger(id) || id <= 0) {
        continue
      }

      const formatted = formatGame(
        game,
        iconMap.get(id) ?? null
      )

      if (!formatted.name.trim()) {
        continue
      }

      uniqueGames.set(id, formatted)
    }

    const games = [...uniqueGames.values()]
      .sort((a, b) => b.players - a.players)

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=900'
    )

    return res.status(200).json({
      total: games.length,
      maximumGames: MAX_GAMES,
      games,
    })
  } catch (error) {
    const details = error instanceof Error
      ? error.message
      : String(error)

    console.error('RBLX FINDER:', error)

    res.setHeader('Cache-Control', 'no-store')

    return res.status(503).json({
      error: 'Roblox games are temporarily unavailable.',
      details,
      games: [],
    })
  }
}
