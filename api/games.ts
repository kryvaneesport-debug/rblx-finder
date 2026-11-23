
const GAME_API = 'https://games.roblox.com/v1'
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

const MAX_GAMES = 250
const MIN_PLAYERS = 500
const SEARCH_CONCURRENCY = 4

// Tyto hry přidáváme přímo podle jejich ověřených Universe ID.
const FEATURED_GAMES = new Map<number, string>([
  [2294168059, 'Horror'], // The Mimic
  [1516533665, 'Horror'], // Piggy
])

// Hledáme konkrétní hry, nikoliv obecné výrazy typu "horror games".
const SEARCH_TERMS = [
  'Doors',
  'Pressure',
  'Apeirophobia',
  'Piggy',
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

const KNOWN_GAME_NAMES = [
  'the mimic',
  'piggy',
  'doors',
  'pressure',
  'apeirophobia',
  'evade',
  'rainbow friends',
  'blox fruits',
  'brookhaven',
  'rivals',
  'adopt me',
  'grow a garden',
  'murder mystery 2',
  'natural disaster survival',
  'arsenal',
  'blade ball',
  'jailbreak',
  'tower of hell',
  'dress to impress',
  'fisch',
  'pet simulator',
  'pet simulator 99',
  '3008',
  'work at a pizza place',
  'meepcity',
  'royale high',
  'dandy world',
  'flee the facility',
  'breaking point',
  'survive the killer',
  'the strongest battlegrounds',
  'shindo life',
  'king legacy',
  'anime adventures',
  'bedwars',
  'islands',
  'build a boat for treasure',
  'bee swarm simulator',
  'vehicle legends',
  'epic minigames',
  'flood escape 2',
]

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getJson(url: string, retries = 2): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 RBLX-FINDER',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const error = new Error(
          `Roblox API ${response.status} (${new URL(url).pathname})`
        )

        lastError = error

        const temporaryError =
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504

        if (!temporaryError || attempt === retries) {
          throw error
        }

        const retryAfter = Number(
          response.headers.get('Retry-After')
        )

        const waitTime = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : 400 * (attempt + 1)

        await delay(waitTime)
        continue
      }

      return await response.json()
    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error(String(error))

      if (attempt === retries) {
        throw lastError
      }

      await delay(400 * (attempt + 1))
    }
  }

  throw lastError ?? new Error('Unknown Roblox API error')
}

function normalizeName(name: string) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchesSearchResult(name: string, term: string) {
  const normalizedName = normalizeName(name)
  const normalizedTerm = normalizeName(term)

  if (!normalizedName || !normalizedTerm) {
    return false
  }

  return (
    normalizedName === normalizedTerm ||
    normalizedName.startsWith(normalizedTerm + ' ') ||
    normalizedName.endsWith(' ' + normalizedTerm) ||
    normalizedName.includes(' ' + normalizedTerm + ' ')
  )
}

function isKnownGame(name: string) {
  const normalized = normalizeName(name)

  return KNOWN_GAME_NAMES.some(known => {
    const expected = normalizeName(known)

    return (
      normalized === expected ||
      normalized.startsWith(expected + ' ') ||
      normalized.endsWith(' ' + expected)
    )
  })
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

  const possibleId = Number(value.universeId)

  if (
    Number.isSafeInteger(possibleId) &&
    possibleId > 0
  ) {
    result.set(possibleId, {
      ...result.get(possibleId),
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

function normalizeGenres(
  value: any,
  name = ''
) {
  const genre = String(value ?? '').toLowerCase()
  const text = normalizeName(name)
  const genres: string[] = []

  const matches = (pattern: RegExp) => pattern.test(text)

  if (
    genre.includes('horror') ||
    matches(/\b(horror|scary|mimic|doors|pressure|apeirophobia|piggy|rainbow friends)\b/)
  ) {
    genres.push('Horror')
  }

  if (
    genre.includes('simulat') ||
    matches(/\b(simulator|tycoon|farming|bee swarm|grow a garden|pet simulator)\b/)
  ) {
    genres.push('Simulator')
  }

  if (
    genre.includes('fight') ||
    genre.includes('action') ||
    matches(/\b(fighting|battle|combat|pvp|rivals|arsenal|blade ball)\b/)
  ) {
    genres.push('Fighting')
  }

  if (
    genre.includes('roleplay') ||
    matches(/\b(roleplay|brookhaven|adopt me|meepcity|royale high)\b/)
  ) {
    genres.push('Roleplay')
  }

  if (
    genre.includes('obby') ||
    matches(/\b(obby|parkour|tower of hell)\b/)
  ) {
    genres.push('Obby')
  }

  if (
    genre.includes('survival') ||
    matches(/\b(survival|survive|zombie|disaster|3008)\b/)
  ) {
    genres.push('Survival')
  }

  if (
    matches(/\b(anime|naruto|one piece|dragon ball|bleach|jujutsu|demon slayer|shindo life)\b/)
  ) {
    genres.push('Anime')
  }

  if (
    matches(/\b(racing|race|driving|drift|vehicle legends)\b/)
  ) {
    genres.push('Racing')
  }

  if (
    matches(/\b(sports|football|soccer|basketball|volleyball|tennis|bedwars)\b/)
  ) {
    genres.push('Sports')
  }

  if (
    matches(/\b(adventure|quest|explore|dungeon|open world)\b/)
  ) {
    genres.push('Adventure')
  }

  return genres.length > 0
    ? [...new Set(genres)]
    : ['Other']
}

async function searchRoblox(
  term: string,
  discovered: Map<number, any>
) {
  const params = new URLSearchParams({
    searchQuery: term,
    sessionId: 'rblx-finder',
    pageType: 'all',
  })

  try {
    const data = await getJson(
      `${SEARCH_API}?${params.toString()}`
    )

    const candidates = collectGames(data)

    for (const [id, game] of candidates) {
      const name = String(
        game.name ?? game.universeName ?? ''
      )

      // Přijímáme pouze skutečné shody s hledaným názvem.
      if (!matchesSearchResult(name, term)) {
        continue
      }

      discovered.set(id, {
        ...discovered.get(id),
        ...game,
      })
    }
  } catch (error) {
    console.error(`Roblox search failed: ${term}`, error)
  }
}

async function loadSearches(
  discovered: Map<number, any>
) {
  for (
    let i = 0;
    i < SEARCH_TERMS.length;
    i += SEARCH_CONCURRENCY
  ) {
    const batch = SEARCH_TERMS.slice(
      i,
      i + SEARCH_CONCURRENCY
    )

    await Promise.all(
      batch.map(term => searchRoblox(term, discovered))
    )
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  try {
    const discovered = new Map<number, any>()

    // 1. Nejdříve přidáme garantované známé hry.
    for (const [id, genre] of FEATURED_GAMES) {
      discovered.set(id, {
        universeId: id,
        genreL1: genre,
      })
    }

    // 2. Vyhledáme konkrétní známé hry.
    await loadSearches(discovered)

    // 3. Upřednostníme The Mimic a Piggy.
    const ids = [
      ...FEATURED_GAMES.keys(),
      ...[...discovered.keys()].filter(
        id => !FEATURED_GAMES.has(id)
      ),
    ].slice(0, MAX_GAMES)

    if (!ids.length) {
      throw new Error('Roblox did not return any games')
    }

    // 4. Načteme aktuální údaje o hrách.
    const details: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      try {
        const data = await getJson(
          `${GAME_API}/games?universeIds=${batch.join(',')}`
        )

        details.push(...(data.data ?? []))
      } catch (error) {
        console.error('Game details failed:', error)
        throw error
      }
    }

    if (!details.length) {
      throw new Error('Roblox returned no game details')
    }

    // 5. Obrázky jsou nepovinné.
    // Když jejich API nefunguje, samotné hry zůstanou dostupné.
    const iconData: any[] = []

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)

      try {
        const data = await getJson(
          `${THUMBNAIL_API}/games/icons?universeIds=${batch.join(',')}&size=512x512&format=Png&isCircular=false`
        )

        iconData.push(...(data.data ?? []))
      } catch (error) {
        console.error('Game icons failed:', error)
      }
    }

    const icons = new Map<number, string>(
      iconData.map((item: any) => [
        item.targetId,
        item.imageUrl,
      ])
    )

    // 6. Odstraníme nesouvisející hry a připravíme výstup.
    const games = details
      .filter((game: any) => {
        const id = Number(game.id)
        const name = String(game.name ?? '')

        return (
          FEATURED_GAMES.has(id) ||
          isKnownGame(name)
        )
      })
      .map((game: any) => {
        const id = Number(game.id)
        const discoveryInfo = discovered.get(id)

        const featuredGenre = FEATURED_GAMES.get(id)

        return {
          id,
          name: game.name,
          description: game.description ?? '',
          genres: featuredGenre
            ? [featuredGenre]
            : normalizeGenres(
                discoveryInfo?.genreL1 ??
                discoveryInfo?.genre ??
                game.genre,
                game.name
              ),
          players: Number(game.playing ?? 0),
          visits: Number(game.visits ?? 0),
          maxPlayers: Number(game.maxPlayers ?? 0),
          icon: icons.get(id) ?? null,
          url: `https://www.roblox.com/games/${game.rootPlaceId}`,
        }
      })
      .filter((game: any) => game.url.endsWith('/undefined') === false)
      .sort((a: any, b: any) => b.players - a.players)

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=900'
    )

    return res.status(200).json({
      total: games.length,
      minimumPlayers: MIN_PLAYERS,
      maximumGames: MAX_GAMES,
      knownGamesIncluded: true,
      games,
    })
  } catch (error) {
    const details = error instanceof Error
      ? error.message
      : String(error)

    console.error('RBLX FINDER:', error)

    return res.status(500).json({
      error: 'Could not load Roblox games.',
      details,
    })
  }
}
