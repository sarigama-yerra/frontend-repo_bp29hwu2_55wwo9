import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])
  return [value, setValue]
}

function NumberInput({ label, value, onChange, min=0, step=1, suffix }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="mt-1 flex items-center rounded border bg-white focus-within:ring-2 focus-within:ring-blue-400">
        <input type="number" min={min} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 outline-none rounded" />
        {suffix && <span className="px-3 text-gray-500">{suffix}</span>}
      </div>
    </label>
  )
}

function Onboarding({ onCreated }) {
  const [name, setName] = useState('')
  const [quitDate, setQuitDate] = useState(() => new Date().toISOString().substring(0,10))
  const [daily, setDaily] = useState(10)
  const [price, setPrice] = useState(8)
  const [cigsPerPack, setCigsPerPack] = useState(20)
  const [currency, setCurrency] = useState('R$')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = name && quitDate && daily >= 0 && price >= 0 && cigsPerPack > 0

  const createUser = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quit_date: quitDate,
          daily_cig_before: daily,
          price_per_pack: price,
          cigs_per_pack: cigsPerPack,
          currency
        })
      })
      if (!res.ok) throw new Error('Falha ao criar usuário')
      const data = await res.json()
      onCreated(data.user_id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl w-full mx-auto bg-white/80 backdrop-blur p-6 rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800">Pare de fumar, jogando</h1>
      <p className="text-gray-600 mt-2">Defina seu plano e acompanhe sua jornada com metas, pontos e conquistas.</p>
      <form onSubmit={createUser} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm text-gray-600">Seu nome</span>
          <input className="mt-1 w-full px-3 py-2 rounded border" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Ana" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Data para parar</span>
          <input type="date" className="mt-1 w-full px-3 py-2 rounded border" value={quitDate} onChange={e=>setQuitDate(e.target.value)} />
        </label>
        <NumberInput label="Cigarros por dia (antes)" value={daily} onChange={setDaily} />
        <NumberInput label="Preço do maço" value={price} onChange={setPrice} step={0.5} suffix={currency} />
        <NumberInput label="Cigarros por maço" value={cigsPerPack} onChange={setCigsPerPack} />
        <label className="block">
          <span className="text-sm text-gray-600">Moeda</span>
          <input className="mt-1 w-full px-3 py-2 rounded border" value={currency} onChange={e=>setCurrency(e.target.value)} placeholder="R$, $, €" />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={!canSubmit || loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg">
          {loading ? 'Salvando...' : 'Começar jornada'}
        </button>
      </form>
    </div>
  )
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-green-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

function Badge({ b }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border">
      <div className="text-xl">{b.icon || '⭐'}</div>
      <div>
        <div className="font-semibold">{b.name}</div>
        <div className="text-sm text-gray-500">{b.description}</div>
      </div>
    </div>
  )
}

function Dashboard({ userId, onReset }) {
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkinCount, setCheckinCount] = useState(0)
  const [savingCheckin, setSavingCheckin] = useState(false)

  const currency = dash?.user?.currency || 'R$'

  const loadDashboard = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/dashboard?user_id=${userId}`)
      if (!res.ok) throw new Error('Erro ao carregar painel')
      const data = await res.json()
      setDash(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  const saveCheckin = async () => {
    setSavingCheckin(true)
    try {
      const res = await fetch(`${API_BASE}/api/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, cigarettes_count: checkinCount })
      })
      if (!res.ok) throw new Error('Não foi possível registrar o dia')
      setCheckinCount(0)
      await loadDashboard()
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingCheckin(false)
    }
  }

  const [craving, setCraving] = useState({ intensity: 3, trigger: '', note: '' })
  const saveCraving = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cravings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...craving })
      })
      if (!res.ok) throw new Error('Não foi possível registrar a fissura')
      setCraving({ intensity: 3, trigger: '', note: '' })
      await loadDashboard()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="text-center text-gray-600">Carregando...</div>
  if (error) return <div className="text-center text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Olá, {dash?.user?.name}</h2>
          <p className="text-gray-500">Continue somando dias e economizando!</p>
        </div>
        <button onClick={onReset} className="text-sm text-gray-500 hover:text-gray-700">Trocar usuário</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Dias desde que parou" value={dash.stats.days_since_quit} />
        <StatCard title="Dias seguidos" value={dash.stats.current_streak} />
        <StatCard title="Dias sem fumar" value={dash.stats.smoke_free_days} />
        <StatCard title="Economia" value={`${currency}${dash.stats.savings.amount}`} subtitle={`~ ${currency}${dash.stats.expected_daily_spend}/dia antes`} />
      </div>

      <div className="bg-white rounded-xl p-5 border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Progresso para marcos</h3>
            <p className="text-sm text-gray-500">Rumo a 90 dias sem fumar</p>
          </div>
          <span className="text-sm text-gray-500">{Math.round(dash.stats.progress)}%</span>
        </div>
        <ProgressBar value={dash.stats.progress} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border">
          <h3 className="font-semibold mb-3">Check-in do dia</h3>
          <div className="flex items-center gap-3">
            <input type="number" min={0} value={checkinCount} onChange={e=>setCheckinCount(Number(e.target.value))} className="w-full px-3 py-2 rounded border" placeholder="Cigarros hoje" />
            <button onClick={saveCheckin} disabled={savingCheckin} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg">Salvar</button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Dica: 0 hoje garante seu streak!</p>
        </div>

        <div className="bg-white rounded-xl p-5 border">
          <h3 className="font-semibold mb-3">Registrar fissura</h3>
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={()=>setCraving(v=>({...v,intensity:i}))} className={`py-2 rounded border ${craving.intensity===i?'bg-orange-100 border-orange-300':'bg-white'}`}>{i}</button>
            ))}
          </div>
          <input value={craving.trigger} onChange={e=>setCraving(v=>({...v, trigger:e.target.value}))} className="mt-3 w-full px-3 py-2 rounded border" placeholder="Gatilho (ex: café, estresse)" />
          <textarea value={craving.note} onChange={e=>setCraving(v=>({...v, note:e.target.value}))} className="mt-2 w-full px-3 py-2 rounded border" placeholder="Como lidou com a vontade?" />
          <div className="mt-3 flex justify-end">
            <button onClick={saveCraving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">Salvar</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border">
        <h3 className="font-semibold mb-3">Conquistas</h3>
        {dash.badges.length === 0 ? (
          <p className="text-gray-500">Conquistas aparecerão aqui conforme você avança.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {dash.badges.map((b, idx) => <Badge key={idx} b={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [userId, setUserId] = useLocalStorage('quit_user_id', null)

  const reset = () => setUserId(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {!userId ? (
          <Onboarding onCreated={setUserId} />
        ) : (
          <Dashboard userId={userId} onReset={reset} />
        )}
        <div className="mt-10 text-center text-sm text-gray-500">
          <a className="underline" href="/test">Testar conexão</a>
        </div>
      </div>
    </div>
  )
}
