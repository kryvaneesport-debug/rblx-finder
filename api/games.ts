
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
const GAME_API = 'https://games.roblox.com/v1'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

const MAX_GAMES = 250
const SEARCH_CONCURRENCY = 5
const REQUEST_TIMEOUT = 7000

const SEARCH_TERMS = [
  // Horror
  'Piggy',
  'The Mimic',
  'Evade',
  'Doors',
  'Pressure',
  'Apeirophobia',
  'Rainbow Friends',
  'Dandy World',
  'Flee the Facility',
  'Breaking Point',
  'Survive the Killer',
  '3008',
  'Forsaken',
  'The Intruder',
  'Dead Silence',
  'Specter',
  'Identity Fraud',
  'Short Creepy Stories',
  'Judy',
  'Residence Massacre',

  // Popular
  'Blox Fruits',
  'Brookhaven',
  'Adopt Me',
  'Grow a Garden',
  'Dress to Impress',
  'RIVALS',
  'Murder Mystery 2',
  'Fisch',
  'Pet Simulator 99',
  'Blade Ball',
  'Arsenal',
  'Jailbreak',
  'BedWars',
  'Royale High',
  'Tower of Hell',
  'Natural Disaster Survival',
  'Shindo Life',
  'King Legacy',
  'Anime Adventures',
  'Bee Swarm Simulator',
  'Build a Boat for Treasure',
  'Work at a Pizza Place',
  'MeepCity',
  'Epic Minigames',
  'Flood Escape 2',
  'Vehicle Legends',
  'Islands',
  'The Strongest Battlegrounds',
  'Murderers VS Sheriffs',

  // Simulator
  'Pet Simulator X',
  'Mining Simulator 2',
  'Restaurant Tycoon 2',
  'Theme Park Tycoon 2',
  'Car Dealership Tycoon',
  'Driving Empire',
  'Fishing Simulator',
  'Anime Fighters Simulator',
  'Bubble Gum Simulator',
  'Lumber Tycoon 2',

  // Roleplay
  'Berry Avenue',
  'Livetopia',
  'Emergency Response Liberty County',
  'Greenville',
  'Welcome to Bloxburg',
  'Club Roblox',
  'Work at a Pizza Place',

  // Adventure and survival
  'Natural Disaster Survival',
  'The Survival Game',
  'Isle',
  'Expedition Antarctica',
  'World Zero',
  'Dungeon Quest',
  'Treasure Quest',
  'Dragon Adventures',
  'Creatures of Sonaria',

  // Fighting and anime
  'Anime Vanguards',
  'Anime Last Stand',
  'Peroxide',
  'Type Soul',
  'Grand Piece Online',
  'A Universal Time',
  'Your Bizarre Adventure',
  'Combat Warriors',
  'Untitled Boxing Game',
  'Heroes Battlegrounds',

  // Racing and sports
  'Driving Empire',
  'Midnight Racing Tokyo',
  'Project Trackday',
  'Super League Soccer',
  'Football Fusion 2',
  'Hoopz',
  'Super Golf',
  'Car Crushers 2',

  // Obby and minigames
  'Obby Creator',
  'Mega Easy Obby',
  'Speed Run 4',
  'Escape Running Head',
  'Color or Die',
  'Epic Minigames',
  'Total Roblox Drama',
  'Outlaster',
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
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

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

function matchesSearch(name: string, term: string) {
  const normalizedName = normalizeName(name)
  const normalizedTerm = normalizeName(term)

  if (!normalizedName || !normalizedTerm) {
    return false
  }

  return normalizedName === normalizedTerm
}

function getGenre(name: string, genre = '') {
  const text = normalizeName(name)
  const sourceGenre = String(genre).toLowerCase()
  const genres: string[] = []

  if (
    sourceGenre.includes('horror') ||
    /\b(piggy|mimic|doors|pressure|evade|apeirophobia|rainbow friends|dandy world|forsaken|intruder|dead silence|specter|judy)\b/.test(text)
  ) genres.push('Horror')

  if (
    sourceGenre.includes('simulat') ||
    /\b(simulator|tycoon|farming|bee swarm|grow a garden|pet simulator|fisch)\b/.test(text)
  ) genres.push('Simulator')

  if (
    sourceGenre.includes('fight') ||
    /\b(rivals|arsenal|blade ball|battlegrounds|combat|fighting|boxing|warriors)\b/.test(text)
  ) genres.push('Fighting')

  if (
    /\b(roleplay|brookhaven|adopt me|meepcity|royale high|berry avenue|livetopia|bloxburg)\b/.test(text)
  ) genres.push('Roleplay')

  if (
    /\b(obby|parkour|tower of hell|escape|speed run)\b/.test(text)
  ) genres.push('Obby')

  if (
    /\b(survival|survive|zombie|disaster|3008|isle)\b/.test(text)
  ) genres.push('Survival')

  if (
    /\b(anime|naruto|one piece|dragon ball|bleach|jujutsu|demon slayer|shindo life|peroxide)\b/.test(text)
  ) genres.push('Anime')

  if (
    /\b(racing|race|driving|drift|vehicle|car|midnight racing)\b/.test(text)
  ) genres.push('Racing')

  if (
    /\b(sports|football|soccer|basketball|volleyball|tennis|golf|boxing)\b/.test(text)
  ) genres.push('Sports')

  if (
    /\b(adventure|quest|explore|dungeon|open world|story|expedition)\b/.test(text)
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

    return [...collectGames(data).values()]
      .filter(game => {
        const name = String(
          game.name ?? game.universeName ?? ''
        )

        return matchesSearch(name, term)
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
    const batchResults = await Promise.all(batch.map(callback))
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
  const name = String(game.name ?? game.universeName ?? '')

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

  const visits = Number(game.visits ?? game.visitCount ?? 0)

  return {
    id,
    name,
    description: String(game.description ?? ''),
    genres: getGenre(name, game.genreL1 ?? game.genre ?? ''),
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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const discovered = await loadSearches()

    if (discovered.size === 0) {
      throw new Error('Roblox search returned no matching games.')
    }

    const candidates = [...discovered.values()].slice(0, MAX_GAMES)

    const ids = candidates
      .map(game => Number(game.universeId))
      .filter(id => Number.isSafeInteger(id) && id > 0)

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

    const mergedGames = candidates.map(candidate => ({
      ...candidate,
      ...(detailMap.get(Number(candidate.universeId)) ?? {}),
    }))

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
          iconMap.set(Number(item.targetId), item.imageUrl)
        }
      }
    }

    const uniqueGames = new Map<number, any>()

    for (const game of mergedGames) {
      const id = Number(game.id ?? game.universeId)

      if (!Number.isSafeInteger(id) || id <= 0) {
        continue
      }

      const formatted = formatGame(game, iconMap.get(id) ?? null)

      if (formatted.name.trim()) {
        uniqueGames.set(id, formatted)
      }
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
