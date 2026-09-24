import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Couple = {
  id: string
  name: string
  invite_code: string | null
}

type Place = {
  id: string
  couple_id: string
  name: string
  google_maps_url: string
  category: string
  memo: string | null
  status: string
  added_by: string
  visited_at: string | null
  created_at: string
}

function Home() {
  const [loading, setLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [placeLoading, setPlaceLoading] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  const [couple, setCouple] = useState<Couple | null>(null)
  const [places, setPlaces] = useState<Place[]>([])

  const [placeName, setPlaceName] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [category, setCategory] = useState('')
  const [memo, setMemo] = useState('')

  // --------------------------------------------------
  // 初期読み込み
  // --------------------------------------------------

  useEffect(() => {
    loadCouple()
  }, [])

  // --------------------------------------------------
  // 自分の共有スペースを取得
  // --------------------------------------------------

  const loadCouple = async () => {
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('ログイン情報を取得できませんでした。')
        return
      }

      const { data: member, error: memberError } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (memberError) {
        console.error('Member lookup error:', memberError)
        setError(`メンバー情報取得エラー: ${memberError.message}`)
        return
      }

      if (!member) {
        setCouple(null)
        return
      }

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id, name, invite_code')
        .eq('id', member.couple_id)
        .single()

      if (coupleError) {
        console.error('Couple lookup error:', coupleError)
        setError(`共有スペース取得エラー: ${coupleError.message}`)
        return
      }

      setCouple(coupleData)

      await loadPlaces(coupleData.id)
    } catch (err) {
      console.error(err)
      setError('データの取得に失敗しました。')
    }
  }

  // --------------------------------------------------
  // Places取得
  // --------------------------------------------------

  const loadPlaces = async (coupleId: string) => {
    const { data, error: placesError } = await supabase
      .from('places')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })

    if (placesError) {
      console.error('Places lookup error:', placesError)
      setError(`場所の取得エラー: ${placesError.message}`)
      return
    }

    setPlaces(data ?? [])
  }

  // --------------------------------------------------
  // ログアウト
  // --------------------------------------------------

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      console.error('Sign out error:', signOutError)
      setError(`ログアウトエラー: ${signOutError.message}`)
    }
  }

  // --------------------------------------------------
  // 共有スペース作成
  // --------------------------------------------------

  const createCouple = async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('ログイン情報を取得できませんでした。')
        return
      }

      const coupleId = crypto.randomUUID()
      const newInviteCode = crypto.randomUUID().slice(0, 8)

      const { error: coupleError } = await supabase
        .from('couples')
        .insert({
          id: coupleId,
          name: 'ふたりの場所',
          invite_code: newInviteCode,
        })

      if (coupleError) {
        console.error('Couple creation error:', coupleError)
        setError(`共有スペース作成エラー: ${coupleError.message}`)
        return
      }

      const { error: memberError } = await supabase
        .from('couple_members')
        .insert({
          couple_id: coupleId,
          user_id: user.id,
        })

      if (memberError) {
        console.error('Member creation error:', memberError)
        setError(`メンバー登録エラー: ${memberError.message}`)
        return
      }

      alert(`共有スペースを作成しました！\n招待コード：${newInviteCode}`)

      await loadCouple()
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // 招待コードで参加
  // --------------------------------------------------

  const joinCouple = async () => {
    setJoinLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('ログイン情報を取得できませんでした。')
        return
      }

      const code = inviteCode.trim()

      if (!code) {
        setError('招待コードを入力してください。')
        return
      }

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id, name, invite_code')
        .eq('invite_code', code)
        .maybeSingle()

      if (coupleError) {
        console.error('Find couple error:', coupleError)
        setError(`共有スペース検索エラー: ${coupleError.message}`)
        return
      }

      if (!coupleData) {
        setError('招待コードが見つかりません。')
        return
      }

      const { error: memberError } = await supabase
        .from('couple_members')
        .insert({
          couple_id: coupleData.id,
          user_id: user.id,
        })

      if (memberError) {
        console.error('Join couple error:', memberError)

        if (memberError.code === '23505') {
          setError('すでにこの共有スペースに参加しています。')
        } else {
          setError(`参加エラー: ${memberError.message}`)
        }

        return
      }

      alert('共有スペースに参加しました！')

      setInviteCode('')
      await loadCouple()
    } finally {
      setJoinLoading(false)
    }
  }

  // --------------------------------------------------
  // 場所を追加
  // --------------------------------------------------

  const createPlace = async () => {
    setPlaceLoading(true)
    setError('')

    try {
      if (!couple) {
        setError('共有スペースがありません。')
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('ログイン情報を取得できませんでした。')
        return
      }

      if (!placeName.trim()) {
        setError('場所の名前を入力してください。')
        return
      }

      const { error: placeError } = await supabase
        .from('places')
        .insert({
          id: crypto.randomUUID(),
          couple_id: couple.id,
          name: placeName.trim(),
          google_maps_url: googleMapsUrl.trim(),
          category: category.trim() || 'その他',
          memo: memo.trim() || null,
          status: 'want',
          added_by: user.id,
        })

      if (placeError) {
        console.error('Place creation error:', placeError)
        setError(`場所の追加エラー: ${placeError.message}`)
        return
      }

      setPlaceName('')
      setGoogleMapsUrl('')
      setCategory('')
      setMemo('')

      await loadPlaces(couple.id)
    } finally {
      setPlaceLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-10">
      <div className="mx-auto max-w-2xl">

        {/* ヘッダー */}
        <header>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm tracking-[0.3em] text-stone-400">
                OUR
              </p>

              <h1 className="mt-1 text-3xl font-semibold text-stone-800">
                PLACES
              </h1>

              <p className="mt-3 text-sm text-stone-500">
                ふたりの行きたい場所
              </p>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="text-sm text-stone-400 underline hover:text-stone-600"
            >
              ログアウト
            </button>
          </div>
        </header>

        {/* エラー */}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4">
            <p className="text-sm text-red-500">
              {error}
            </p>
          </div>
        )}

        {/* 共有スペースがない場合 */}
        {!couple && (
          <>
            <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm text-stone-400">
                まだ共有スペースがありません。
              </p>

              <h2 className="mt-2 text-xl font-medium text-stone-800">
                ふたりの場所をはじめよう
              </h2>

              <button
                type="button"
                onClick={createCouple}
                disabled={loading}
                className="mt-6 rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {loading ? '作成中...' : '＋ 共有スペースを作る'}
              </button>
            </section>

            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm text-stone-400">
                招待コードを持っていますか？
              </p>

              <h2 className="mt-2 text-xl font-medium text-stone-800">
                共有スペースに参加
              </h2>

              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="招待コードを入力"
                className="mt-5 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              />

              <button
                type="button"
                onClick={joinCouple}
                disabled={joinLoading}
                className="mt-3 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {joinLoading ? '参加中...' : '共有スペースに参加'}
              </button>
            </section>
          </>
        )}

        {/* 共有スペースがある場合 */}
        {couple && (
          <>
            {/* 共有スペース */}
            <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm text-stone-400">
                共有スペース
              </p>

              <h2 className="mt-2 text-xl font-medium text-stone-800">
                {couple.name}
              </h2>

              <p className="mt-4 text-xs text-stone-400">
                招待コード
              </p>

              <p className="mt-1 font-mono text-lg tracking-widest text-stone-700">
                {couple.invite_code}
              </p>
            </section>

            {/* 場所追加 */}
            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm text-stone-400">
                新しい場所
              </p>

              <h2 className="mt-2 text-xl font-medium text-stone-800">
                行きたい場所を追加
              </h2>

              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="場所の名前"
                className="mt-5 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              />

              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="Google Maps URL"
                className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              />

              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="カテゴリ（カフェ、レストランなど）"
                className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              />

              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="メモ"
                rows={3}
                className="mt-3 w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              />

              <button
                type="button"
                onClick={createPlace}
                disabled={placeLoading}
                className="mt-4 rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {placeLoading ? '追加中...' : '＋ 場所を追加'}
              </button>
            </section>

            {/* 場所一覧 */}
            <section className="mt-6">
              <h2 className="px-1 text-xl font-medium text-stone-800">
                行きたい場所
              </h2>

              {places.length === 0 ? (
                <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-sm text-stone-400">
                    まだ場所がありません。
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {places.map((place) => (
                    <article
                      key={place.id}
                      className="rounded-3xl bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-medium text-stone-800">
                            {place.name}
                          </h3>

                          <p className="mt-1 text-xs text-stone-400">
                            {place.category}
                          </p>
                        </div>

                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">
                          行きたい
                        </span>
                      </div>

                      {place.memo && (
                        <p className="mt-4 text-sm leading-6 text-stone-500">
                          {place.memo}
                        </p>
                      )}

                      {place.google_maps_url && (
                        <a
                          href={place.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-block text-sm text-stone-500 underline"
                        >
                          Google Mapsで見る
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Home
