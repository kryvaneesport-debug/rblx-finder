
import { useEffect, useState } from 'react'

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

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [category, setCategory] = useState('All Games')
  const [sort, setSort] = useState('players')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/games')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load games')
        return response.json()
      })
      .then(data => setGames(data.games ?? []))
      .catch(() => setError('Could not load Roblox games. Please try again later.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredGames = games
    .filter(game =>
      category === 'All Games' || game.genres?.includes(category)
    )
    .filter(game =>
      game.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sort === 'players'
        ? b.players - a.players
        : b.visits - a.visits
    )

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
          <h1>Find your next<br /><span>favorite game.</span></h1>
          <p>Explore Roblox games, discover new experiences and find what's popular.</p>

          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
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
                  : category + ' games'}
              </h2>
              <p>
                {loading
                  ? 'Loading games...'
                  : `${filteredGames.length} games found`}
              </p>
            </div>

            <div className="sort-control">
              <label htmlFor="sort">SORT BY</label>
              <select
                id="sort"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="players">Most players</option>
                <option value="visits">Most visits</option>
              </select>
            </div>
          </div>

          {loading && <div className="empty">Loading Roblox games...</div>}

          {error && <div className="empty">{error}</div>}

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
                    style={{ textDecoration: 'none', color: 'inherit' }}
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

                      <p>{game.genres?.join(' • ') || 'Other'}</p>

                      <div className="game-stats">
                        <span>♟ {game.players.toLocaleString('en-US')} playing</span>
                        <span className="playing">● LIVE</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {filteredGames.length === 0 && (
                <div className="empty">No games found. Try another search.</div>
              )}
            </>
          )}

          <p className="demo-note">
            Player counts and visits are provided by Roblox. Data may be delayed.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
