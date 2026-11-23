
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
const GAME_API = 'https://games.roblox.com/v1'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

const MAX_GAMES = 100
const SEARCH_CONCURRENCY = 5
const REQUEST_TIMEOUT = 7000

const SEARCH_TERMS = [
  'The Mimic',
  'Piggy',
  'Doors',
  'Pressure',
  'Apeirophobia',
  'Evade',
  'Rainbow Friends',
  'Blox Fruits',
  'Brookhaven',
  'Rivals',
  'Adopt Me',
  'Grow a Garden',
  'Murder Mystery 2',
  'Natural Disaster Survival',
  'Arsenal',
  'Blade Ball',
  'Jailbreak',
  'Tower of Hell',
  'Dress to Impress',
  'Fisch',
  'Pet Simulator 99',
  '3008',
  'Work at a Pizza Place',
  'MeepCity',
  'Royale High',
  'Dandy’s World',
  'Flee the Facility',
  'Breaking Point',
  'Survive the Killer',
  'The Strongest Battlegrounds',
  'Shindo Life',
  'King Legacy',
  'Anime Adventures',
  'BedWars',
  'Islands',
  'Build a Boat for Treasure',
  'Bee Swarm Simulator',
  'Vehicle Legends',
  'Epic Minigames',
  'Flood Escape 2',
]

const KNOWN_GAME_NAMES = SEARCH_TERMS.map(normalizeName)

function normalizeName(name: string) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isKnownGame(name: string) {
  return KNOWN_GAME_NAMES.includes(normalizeName(name))
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
        await delay(500)
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

  if (Number.isSafeInteger(id) && id > 0) {
    result.set(id, {
      ...result.get(id),
      ...value,
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
    /\b(piggy|mimic|doors|pressure|evade|apeirophobia|rainbow friends)\b/.test(text)
  ) genres.push('Horror')

  if (
    sourceGenre.includes('simulat') ||
    /\b(simulator|tycoon|farming|bee swarm|grow a garden|pet simulator)\b/.test(text)
  ) genres.push('Simulator')

  if (
    sourceGenre.includes('fight') ||
    /\b(rivals|arsenal|blade ball|battlegrounds|combat|fighting)\b/.test(text)
  ) genres.push('Fighting')

  if (
    /\b(roleplay|brookhaven|adopt me|meepcity|royale high)\b/.test(text)
  ) genres.push('Roleplay')

  if (
    /\b(obby|parkour|tower of hell)\b/.test(text)
  ) genres.push('Obby')

  if (
    /\b(survival|survive|zombie|disaster|3008)\b/.test(text)
  ) genres.push('Survival')

  if (
    /\b(anime|naruto|one piece|dragon ball|bleach|jujutsu|demon slayer|shindo life)\b/.test(text)
  ) genres.push('Anime')

  if (
    /\b(racing|race|driving|drift|vehicle legends)\b/.test(text)
  ) genres.push('Racing')

  if (
    /\b(sports|football|soccer|basketball|volleyball|tennis|bedwars)\b/.test(text)
  ) genres.push('Sports')

  if (
    /\b(adventure|quest|explore|dungeon|open world)\b/.test(text)
  ) genres.push('Adventure')

  return genres.length ? [...new Set(genres)] : ['Other']
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

    const candidates = collectGames(data)
    const results: any[] = []

    for (const [id, game] of candidates) {
      const name = String(
        game.name ?? game.universeName ?? ''
      )

      // Přijímáme pouze originální název hry.
      if (!isKnownGame(name)) {
        continue
      }

      if (normalizeName(name) !== normalizeName(term)) {
        continue
      }

      results.push({
        ...game,
        universeId: id,
      })
    }

    return results
  } catch (error) {
    console.error(`Search failed for ${term}:`, error)
    return []
  }
}

async function loadSearches() {
  const discovered = new Map<number, any>()

  for (
    let i = 0;
    i < SEARCH_TERMS.length;
    i += SEARCH_CONCURRENCY
  ) {
    const batch = SEARCH_TERMS.slice(
      i,
      i + SEARCH_CONCURRENCY
    )

    const results = await Promise.all(
      batch.map(term => searchRoblox(term))
    )

    for (const games of results) {
      for (const game of games) {
        discovered.set(game.universeId, {
          ...discovered.get(game.universeId),
          ...game,
        })
      }
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
    game.rootPlaceId ?? game.placeId ?? game.rootPlace?.id
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
    // 1. Vyhledáme celý seznam známých her.
    const discovered = await loadSearches()

    if (discovered.size === 0) {
      throw new Error(
        'Roblox search returned no known games.'
      )
    }

    const candidates = [...discovered.values()].slice(
      0,
      MAX_GAMES
    )

    const ids = candidates
      .map(game => Number(game.universeId))
      .filter(id => Number.isSafeInteger(id) && id > 0)

    // 2. Načteme statistiky.
    const details: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      try {
        const data = await getJson(
          `${GAME_API}/games?universeIds=${batch.join(',')}`,
          0
        )

        details.push(...(data.data ?? []))
      } catch (error) {
        console.error('Game details unavailable:', error)
        break
      }
    }

    // 3. Spojíme výsledky vyhledávání a statistiky.
    const detailMap = new Map<number, any>()

    for (const game of details) {
      detailMap.set(Number(game.id), game)
    }

    const mergedGames = candidates.map(candidate => ({
      ...candidate,
      ...(detailMap.get(Number(candidate.universeId)) ?? {}),
    }))

    // 4. Načteme obrázky.
    const iconMap = new Map<number, string>()

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      try {
        const data = await getJson(
          `${THUMBNAIL_API}/games/icons?universeIds=${batch.join(',')}&size=512x512&format=Png&isCircular=false`,
          0
        )

        for (const item of data.data ?? []) {
          if (item.targetId && item.imageUrl) {
            iconMap.set(
              Number(item.targetId),
              item.imageUrl
            )
          }
        }
      } catch (error) {
        console.error('Thumbnails unavailable:', error)
      }
    }

    // 5. Odstraníme kopie a seřadíme hry.
    const games = mergedGames
      .filter(game => {
        const name = String(
          game.name ?? game.universeName ?? ''
        )

        return isKnownGame(name)
      })
      .map(game => {
        const id = Number(game.id ?? game.universeId)

        return formatGame(
          game,
          iconMap.get(id) ?? null
        )
      })
      .filter(game => game.id > 0)
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
