
const BASE = 'https://apis.roblox.com/explore-api/v1'
const SEARCH_API = 'https://apis.roblox.com/search-api/omni-search'
const GAME_API = 'https://games.roblox.com/v1'
const THUMBNAIL_API = 'https://thumbnails.roblox.com/v1'

const MAX_GAMES = 500
const MIN_PLAYERS = 500

const FEATURED_GAMES = new Map<number, string>([
  [2294168059, 'Horror'], // The Mimic
])

const KNOWN_GAME_NAMES = [
  'the mimic',
  'doors',
  'pressure',
  'apeirophobia',
  'piggy',
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
  'untitled tag game',
  'flee the facility',
  'breaking point',
  'survive the killer',
  'rainbow friends 2',
  'the strongest battlegrounds',
  'shindo life',
  'king legacy',
  'anime adventures',
  'anime defenders',
  'bedwars',
  'islands',
  'build a boat for treasure',
  'bee swarm simulator',
  'pet catchers',
  'vehicle legends',
  'emergency response',
  'livtopia',
  'twilight daycare',
  'super bomb survival',
  'epic minigames',
  'flood escape 2',
]

const SEARCH_TERMS = [
  'The Mimic',
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
  'horror games',
  'survival games',
  'anime games',
  'simulator games',
  'roleplay games',
  'obby games',
  'racing games',
  'adventure games',
  'fighting games',
  'popular Roblox games',
]

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 RBLX-FINDER',
    },
  })

  if (!response.ok) {
    throw new Error(`Roblox API error: ${response.status}`)
  }

  return response.json()
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
  const normalized = normalizeName(name)

  return KNOWN_GAME_NAMES.some(known => {
    const normalizedKnown = normalizeName(known)

    return (
      normalized === normalizedKnown ||
      normalized.startsWith(normalizedKnown + ' ')
    )
  })
}

function normalizeGenres(
  value: any,
  name = '',
  description = ''
) {
  const genre = String(value ?? '').toLowerCase()
  const text = `${name} ${description}`.toLowerCase()
  const genres: string[] = []

  const matches = (pattern: RegExp) => pattern.test(text)

  if (
    genre.includes('horror') ||
    matches(/\b(horror|scary|terror|haunted|nightmare|creepy|mimic|doors|pressure|apeirophobia|piggy|rainbow friends)\b/)
  ) genres.push('Horror')

  if (
    genre.includes('simulat') ||
    matches(/\b(simulator|tycoon|pet sim|farming|restaurant|business sim|bee swarm|grow a garden)\b/)
  ) genres.push('Simulator')

  if (
    genre.includes('fight') ||
    genre.includes('action') ||
    matches(/\b(fighting|battle|combat|pvp|war|shooter|fps|arena|boxing|rivals|arsenal|blade ball)\b/)
  ) genres.push('Fighting')

  if (
    genre.includes('roleplay') ||
    matches(/\b(roleplay|role play|brookhaven|adopt me|bloxburg|meepcity|royale high)\b/)
  ) genres.push('Roleplay')

  if (
    genre.includes('obby') ||
    matches(/\b(obby|parkour|tower of hell)\b/)
  ) genres.push('Obby')

  if (
    matches(/\b(survival|survive|zombie|apocalypse|disaster|last alive|3008)\b/)
  ) genres.push('Survival')

  if (
    matches(/\b(anime|naruto|one piece|dragon ball|bleach|jujutsu|demon slayer|shindo life)\b/)
  ) genres.push('Anime')

  if (
    matches(/\b(racing|race|driving|car simulator|drift|speedway|vehicle legends)\b/)
  ) genres.push('Racing')

  if (
    matches(/\b(sports|football|soccer|basketball|volleyball|tennis|bedwars)\b/)
  ) genres.push('Sports')

  if (
    matches(/\b(adventure|quest|explore|dungeon|open world)\b/)
  ) genres.push('Adventure')

  return genres.length > 0
    ? [...new Set(genres)]
    : ['Other']
}

async function searchRoblox(
  term: string,
  discovered: Map<number, any>
) {
  let pageToken = ''

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
        `${SEARCH_API}?${params.toString()}`
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
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  try {
    const discovered = new Map<number, any>()

    // 1. Add featured games
    for (const [id, genre] of FEATURED_GAMES) {
      discovered.set(id, {
        universeId: id,
        genreL1: genre,
      })
    }

    // 2. Load Roblox Discover categories
    try {
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

        try {
          const content = await getJson(
            `${BASE}/get-sort-content?sessionId=rblx-finder-session&sortId=${encodeURIComponent(sortId)}&device=computer&country=all&maxRows=100`
          )

          collectGames(content, discovered)
        } catch (error) {
          console.error(`Discover sort failed: ${sortId}`, error)
        }
      }
    } catch (error) {
      console.error('Roblox Discover failed:', error)
    }

    // 3. Search for additional games
    for (let i = 0; i < SEARCH_TERMS.length; i += 5) {
      const batch = SEARCH_TERMS.slice(i, i + 5)

      await Promise.all(
        batch.map(term => searchRoblox(term, discovered))
      )
    }

    // 4. Prepare game IDs
    const ids = [
      ...FEATURED_GAMES.keys(),
      ...[...discovered.keys()].filter(
        id => !FEATURED_GAMES.has(id)
      ),
    ].slice(0, MAX_GAMES)

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

    // 7. Filter and format games
    const games = details
      .filter((game: any) =>
        (game.playing ?? 0) >= MIN_PLAYERS ||
        FEATURED_GAMES.has(game.id) ||
        isKnownGame(game.name ?? '')
      )
      .map((game: any) => {
        const discoveryInfo = discovered.get(game.id)

        return {
          id: game.id,
          name: game.name,
          description: game.description,
          genres: normalizeGenres(
            FEATURED_GAMES.get(game.id) ??
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
