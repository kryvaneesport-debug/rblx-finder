
import { useState } from 'react'

const games = [
  { name: 'Blox Fruits', genre: 'Fighting', players: 185000, rating: 92, emoji: '⚔️', color: 'orange' },
  { name: 'Brookhaven RP', genre: 'Roleplay', players: 142000, rating: 91, emoji: '🏡', color: 'blue' },
  { name: 'DOORS', genre: 'Horror', players: 38000, rating: 94, emoji: '🚪', color: 'purple' },
  { name: 'Adopt Me!', genre: 'Simulator', players: 65000, rating: 90, emoji: '🐶', color: 'pink' },
  { name: 'Arsenal', genre: 'Fighting', players: 12000, rating: 88, emoji: '🎯', color: 'red' },
  { name: 'Dress To Impress', genre: 'Simulator', players: 52000, rating: 93, emoji: '👗', color: 'pink' },
  { name: 'Murder Mystery 2', genre: 'Horror', players: 29000, rating: 89, emoji: '🔪', color: 'purple' },
  { name: 'Tower of Hell', genre: 'Obby', players: 8000, rating: 85, emoji: '🏗️', color: 'blue' },
]

const categories = ['All Games', 'Horror', 'Simulator', 'Fighting', 'Roleplay', 'Obby']

function App() {
  const [category, setCategory] = useState('All Games')
  const [sort, setSort] = useState('players')
  const [search, setSearch] = useState('')

  const filteredGames = games
    .filter(game => category === 'All Games' || game.genre === category)
    .filter(game => game.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'players' ? b.players - a.players : b.rating - a.rating)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">RBLX<span>FINDER</span></div>
        <p className="side-label">DISCOVER</p>
        {categories.map(item => (
          <button
            key={item}
            className={`nav-item ${category === item ? 'active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item === 'All Games' ? '🎮' : item === 'Horror' ? '👻' : item === 'Simulator' ? '🌍' : item === 'Fighting' ? '⚔️' : item === 'Roleplay' ? '🏡' : '🏃'}
            <span>{item}</span>
          </button>
        ))}
        <div className="sidebar-bottom">YOUR ROBLOX GAME HUB</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">DISCOVER / <b>{category.toUpperCase()}</b></span>
          <span className="online"><i /> GAME DISCOVERY PLATFORM</span>
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
              <h2>{category === 'All Games' ? 'Discover games' : category + ' games'}</h2>
              <p>{filteredGames.length} games found</p>
            </div>
            <div className="sort-control">
              <label htmlFor="sort">SORT BY</label>
              <select id="sort" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="players">Most players</option>
                <option value="rating">Best rated</option>
              </select>
            </div>
          </div>

          <div className="game-grid">
            {filteredGames.map((game, index) => (
              <article className="game-card" key={game.name}>
                <div className={`game-art ${game.color}`}>
                  <span className="rank">#{index + 1}</span>
                  <span className="game-emoji">{game.emoji}</span>
                  <span className="art-caption">ROBLOX EXPERIENCE</span>
                </div>
                <div className="game-info">
                  <div className="game-title-row">
                    <h3>{game.name}</h3>
                    <span className="rating">★ {game.rating}%</span>
                  </div>
                  <p>{game.genre}</p>
                  <div className="game-stats">
                    <span>♟ {game.players.toLocaleString('en-US')} players</span>
                    <span className="playing">● Popular</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <div className="empty">No games found. Try another search.</div>
          )}

          <p className="demo-note">Preview with sample data. Live Roblox data will be connected later.</p>
        </section>
      </main>
    </div>
  )
}

export default App
