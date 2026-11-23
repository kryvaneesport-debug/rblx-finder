
import { useEffect, useMemo, useState } from 'react'

type Game = {
  id: number
  name: string
  description: string
  genres: string[]
  players: number
  visits: number
  maxPlayers: number
  icon: string | null
  url: string
}

const categories = [
  { name: 'All Games', icon: '🎮' },
  { name: 'Horror', icon: '👻' },
  { name: 'Simulator', icon: '🌍' },
  { name: 'Fighting', icon: '⚔️' },
  { name: 'Roleplay', icon: '🏡' },
  { name: 'Obby', icon: '🏃' },
  { name: 'Survival', icon: '🧟' },
  { name: 'Anime', icon: '⚡' },
  { name: 'Racing', icon: '🏎️' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Adventure', icon: '🗺️' },
  { name: 'Other', icon: '🎲' },
]

const officialNames: Record<number, string> = {
  2440500124: 'Doors',
  1516533665: 'Piggy',
  2294168059: 'The Mimic',
  3761186887: 'Apeirophobia',
  994732206: 'Blox Fruits',
  6035872082: 'RIVALS',
  3085257211: 'Rainbow Friends',
}

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [category, setCategory] = useState('All Games')
  const [sort, setSort] = useState('players')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState('')
  const [totalGames, setTotalGames] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadGames() {
      setLoading(true)
      setError('')
      setErrorDetails('')

      let lastError = 'Unknown error'

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(
            `/api/games?refresh=${Date.now()}-${attempt}`,
            {
              method: 'GET',
              cache: 'no-store',
              headers: {
                Accept: 'application/json',
              },
            }
          )

          const data = await response.json()

          if (!response.ok) {
            throw new Error(
              data.details ||
              data.error ||
              `Server returned HTTP ${response.status}`
            )
          }

          if (!Array.isArray(data.games)) {
            throw new Error('The API returned an invalid games list.')
          }

          const validGames: Game[] = data.games
            .filter((game: any) =>
              Number.isSafeInteger(Number(game.id)) &&
              Number(game.id) > 0 &&
              typeof game.name === 'string' &&
              game.name.trim().length > 0
            )
            .map((game: any) => {
              const id = Number(game.id)

              return {
                id,
                name: officialNames[id] || game.name,
                description: String(game.description || ''),
                genres: Array.isArray(game.genres)
                  ? game.genres
                  : ['Other'],
                players: Math.max(0, Number(game.players) || 0),
                visits: Math.max(0, Number(game.visits) || 0),
                maxPlayers: Math.max(0, Number(game.maxPlayers) || 0),
                icon: typeof game.icon === 'string' ? game.icon : null,
                url: typeof game.url === 'string'
                  ? game.url
                  : `https://www.roblox.com/discover/?Keyword=${encodeURIComponent(game.name)}`,
              }
            })

          if (!active) return

          setGames(validGames)
          setTotalGames(Number(data.total) || validGames.length)
          setLoading(false)
          return
        } catch (err) {
          lastError = err instanceof Error
            ? err.message
            : String(err)

          console.error(`RBLX FINDER attempt ${attempt}:`, err)

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
        }
      }

      if (!active) return

      setError('Could not load Roblox games.')
      setErrorDetails(lastError)
      setLoading(false)
    }

    loadGames()

    return () => {
      active = false
    }
  }, [reloadKey])

  const filteredGames = useMemo(() => {
    return games
      .filter(game =>
        category === 'All Games' ||
        game.genres.includes(category)
      )
      .filter(game =>
        game.name.toLowerCase().includes(search.trim().toLowerCase())
      )
      .sort((a, b) =>
        sort === 'players'
          ? b.players - a.players
          : b.visits - a.visits
      )
  }, [games, category, search, sort])

  function retryLoading() {
    setReloadKey(value => value + 1)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">RBLX<span>FINDER</span></div>
        <p className="side-label">DISCOVER</p>

        {categories.map(item => (
          <button
            key={item.name}
            className={`nav-item ${category === item.name ? 'active' : ''}`}
            onClick={() => setCategory(item.name)}
          >
            {item.icon}
            <span>{item.name}</span>
          </button>
        ))}

        <div className="sidebar-bottom">YOUR ROBLOX GAME HUB</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">
            DISCOVER / <b>{category.toUpperCase()}</b>
          </span>
          <span className="online"><i /> LIVE ROBLOX DATA</span>
        </header>

        <section className="hero">
          <div className="hero-tag">YOUR NEXT ADVENTURE STARTS HERE</div>
          <h1>
            Find your next<br />
            <span>favorite game.</span>
          </h1>

          <p>
            Explore Roblox games, discover new experiences and find what's popular.
          </p>

          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search Roblox games..."
            />
            <kbd>SEARCH</kbd>
          </div>
        </section>

        <section className="games-section">
          <div className="section-heading">
            <div>
              <div className="hero-tag">EXPLORE THE UNIVERSE</div>

              <h2>
                {category === 'All Games'
                  ? 'Discover games'
                  : `${category} games`}
              </h2>

              <p>
                {loading
                  ? 'Loading games...'
                  : `${filteredGames.length} of ${totalGames} games found`}
              </p>
            </div>

            <div className="sort-control">
              <label htmlFor="sort">SORT BY</label>
              <select
                id="sort"
                value={sort}
                onChange={event => setSort(event.target.value)}
              >
                <option value="players">Most players</option>
                <option value="visits">Most visits</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="empty">
              Loading Roblox games...
            </div>
          )}

          {!loading && error && (
            <div className="empty">
              <h3>{error}</h3>
              <p>{errorDetails}</p>
              <button
                className="nav-item active"
                onClick={retryLoading}
                style={{
                  display: 'inline-flex',
                  width: 'auto',
                  marginTop: '15px',
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="game-grid">
                {filteredGames.map((game, index) => (
                  <a
                    className="game-card"
                    key={game.id}
                    href={game.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      className="game-art"
                      style={{
                        backgroundImage: game.icon
                          ? `linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.55)), url("${game.icon}")`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <span className="rank">#{index + 1}</span>
                      <span className="art-caption">ROBLOX EXPERIENCE</span>
                    </div>

                    <div className="game-info">
                      <div className="game-title-row">
                        <h3>{game.name}</h3>
                      </div>

                      <p>{game.genres.join(' • ')}</p>

                      <div className="game-stats">
                        <span>
                          ♟ {game.players.toLocaleString('en-US')} playing
                        </span>
                        <span className="playing">● LIVE</span>
                      </div>

                      <div className="game-stats">
                        <span>
                          ◉ {game.visits.toLocaleString('en-US')} visits
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {filteredGames.length === 0 && (
                <div className="empty">
                  No games found. Try another search.
                </div>
              )}
            </>
          )}

          <p className="demo-note">
            Showing {games.length} loaded games. Player counts and visits are provided by Roblox and may be delayed.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
