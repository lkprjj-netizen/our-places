import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Couple = {
  id: string
  name: string
  invite_code: string | null
}

type Category = {
  id: string
  couple_id: string
  name: string
  sort_order: number
}

type Place = {
  id: string
  couple_id: string
  name: string
  google_maps_url: string
  category_id: string
  memo: string | null
  status: string
  added_by: string
  visited_at: string | null
  created_at: string
}

type PlaceReview = {
  id: string
  place_id: string
  user_id: string
  rating: number
  review: string | null
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
  const [memo, setMemo] = useState('')

  const [userId, setUserId] = useState<string | null>(null)

  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)

  const [editName, setEditName] = useState('')
  const [editGoogleMapsUrl, setEditGoogleMapsUrl] = useState('')
  const [editMemo, setEditMemo] = useState('')

  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [reviews, setReviews] = useState<PlaceReview[]>([])
  const [reviewingPlaceId, setReviewingPlaceId] = useState<string | null>(null)

  const [placeTab, setPlaceTab] = useState<'want' | 'visited'>('want')
  const [searchQuery, setSearchQuery] = useState('')

  const [categoryFilter, setCategoryFilter] = useState('すべて')

  const [showSpaceSettings, setShowSpaceSettings] = useState(false)
  const [spaceName, setSpaceName] = useState('')
  const [spaceNameLoading, setSpaceNameLoading] = useState(false)

  const [isPartnerConnected, setIsPartnerConnected] = useState(false)
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false)

  const [openPlaceMenuId, setOpenPlaceMenuId] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)

  // --------------------------------------------------
  // 初期読み込み
  // --------------------------------------------------

  useEffect(() => {
    loadCouple()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCouple()
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement

      if (!target.closest('[data-place-menu]')) {
        setOpenPlaceMenuId(null)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
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

      setUserId(user.id)

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

      const { data: members, error: membersError } = await supabase
        .from('couple_members')
        .select('user_id')
        .eq('couple_id', member.couple_id)

      if (membersError) {
        console.error('Couple members lookup error:', membersError)
        setError(`メンバー情報取得エラー: ${membersError.message}`)
        return
      }

      setIsPartnerConnected((members?.length ?? 0) >= 2)

      setCouple(coupleData)

      await loadCategories(coupleData.id)
      await loadPlaces(coupleData.id)
    } catch (err) {
      console.error(err)
      setError('データの取得に失敗しました。')
    }
  }

  // --------------------------------------------------
  // Category取得
  // --------------------------------------------------

  const loadCategories = async (coupleId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, couple_id, name, sort_order')
      .eq('couple_id', coupleId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Categories lookup error:', error)
      setError(`カテゴリの取得エラー: ${error.message}`)
      return
    }

    setCategories(data ?? [])
  }

  const createCategory = async () => {
    if (!couple) {
      return
    }

    const name = newCategoryName.trim()

    if (!name) {
      setError('カテゴリ名を入力してください。')
      return
    }

    if (name.length > 20) {
      setError('カテゴリ名は20文字以内で入力してください。')
      return
    }

    if (categories.length >= 20) {
      setError('カテゴリは20件までです。')
      return
    }

    setCategoryLoading(true)
    setError('')

    const { error } = await supabase.rpc('create_category', {
      p_couple_id: couple.id,
      p_name: name,
    })

    if (error) {
      console.error('Category creation error:', error)
      setError(`カテゴリの追加エラー: ${error.message}`)
      setCategoryLoading(false)
      return
    }

    setNewCategoryName('')

    await loadCategories(couple.id)

    setCategoryLoading(false)
  }

  const deleteCategory = async (category: Category) => {
    if (!couple) {
      return
    }

    if (categories.length <= 1) {
      setError('カテゴリは1件以上必要です。')
      return
    }

    const placeCount = places.filter(
      (place) => place.category_id === category.id
    ).length

    if (placeCount > 0) {
      setError(
        `「${category.name}」には${placeCount}件の場所が登録されているため削除できません。`
      )
      return
    }

    const confirmed = window.confirm(
      `「${category.name}」を削除しますか？`
    )

    if (!confirmed) {
      return
    }

    setCategoryLoading(true)
    setError('')

    const { error: deleteError } = await supabase.rpc(
      'delete_category',
      {
        p_category_id: category.id,
      }
    )

    if (deleteError) {
      console.error('Category deletion error:', deleteError)
      setError(`カテゴリの削除エラー: ${deleteError.message}`)
      setCategoryLoading(false)
      return
    }

    if (categoryFilter === category.id) {
      setCategoryFilter('すべて')
    }

    await loadCategories(couple.id)

    setCategoryLoading(false)
  }

  const updateCategory = async (categoryId: string) => {
    const name = editingCategoryName.trim()

    if (!name) {
      setError('カテゴリ名を入力してください。')
      return
    }

    setCategoryLoading(true)
    setError('')

    const { error } = await supabase
      .from('categories')
      .update({
        name,
      })
      .eq('id', categoryId)
      .eq('couple_id', couple?.id)

    if (error) {
      console.error('Category update error:', error)
      setError(`カテゴリの更新エラー: ${error.message}`)
      setCategoryLoading(false)
      return
    }

    if (couple) {
      await loadCategories(couple.id)
    }

    setEditingCategoryId(null)
    setEditingCategoryName('')
    setCategoryLoading(false)
  }

  const reorderCategories = async (
    draggedCategoryId: string,
    targetCategoryId: string
  ) => {
    if (draggedCategoryId === targetCategoryId) {
      return
    }

    const currentIndex = categories.findIndex(
      (category) => category.id === draggedCategoryId
    )

    const targetIndex = categories.findIndex(
      (category) => category.id === targetCategoryId
    )

    if (currentIndex === -1 || targetIndex === -1) {
      return
    }

    const reordered = [...categories]
    const [draggedCategory] = reordered.splice(currentIndex, 1)

    reordered.splice(targetIndex, 0, draggedCategory)

    // 先にUIを更新
    const updatedCategories = reordered.map((category, index) => ({
      ...category,
      sort_order: index + 1,
    }))

    setCategories(updatedCategories)

    setCategoryLoading(true)
    setError('')

    try {
      for (const category of updatedCategories) {
        const { error } = await supabase
          .from('categories')
          .update({
            sort_order: category.sort_order,
          })
          .eq('id', category.id)
          .eq('couple_id', category.couple_id)

        if (error) {
          throw error
        }
      }
    } catch (error) {
      console.error('Category reorder error:', error)

      setError(
        error instanceof Error
          ? `カテゴリの並び替えエラー: ${error.message}`
          : 'カテゴリの並び替えに失敗しました。'
      )

      if (couple) {
        await loadCategories(couple.id)
      }
    } finally {
      setCategoryLoading(false)
      setDraggingCategoryId(null)
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
    await loadReviews()
  }

  const loadReviews = async () => {
    const { data, error: reviewsError } = await supabase
      .from('place_reviews')
      .select('id, place_id, user_id, rating, review')

    if (reviewsError) {
      console.error('Reviews lookup error:', reviewsError)
      setError(`評価の取得エラー: ${reviewsError.message}`)
      return
    }

    setReviews(data ?? [])
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

      const { data: coupleData, error: coupleError } = await supabase
        .rpc('create_couple_with_categories')

      if (coupleError) {
        console.error('Couple creation error:', coupleError)
        setError(`共有スペース作成エラー: ${coupleError.message}`)
        return
      }

      if (!coupleData) {
        setError('共有スペースを作成できませんでした。')
        return
      }

      alert(
        `共有スペースを作成しました！\n招待コード：${coupleData.invite_code}`
      )

      await loadCouple()
    } catch (err) {
      console.error(err)
      setError('共有スペースの作成に失敗しました。')
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

      if (placeName.trim().length > 50) {
        setError('場所の名前は50文字以内で入力してください。')
        return
      }

      if (memo.trim().length > 200) {
        setError('メモは200文字以内で入力してください。')
        return
      }

      if (!categoryId) {
        setError('カテゴリを選択してください。')
        return
      }

      const { error: placeError } = await supabase
        .from('places')
        .insert({
          id: crypto.randomUUID(),
          couple_id: couple.id,
          name: placeName.trim(),
          google_maps_url: googleMapsUrl.trim(),
          category_id: categoryId,
          memo: memo.trim() || null,
          status: 'want',
          added_by: user.id,
        })

      if (placeError) {
        console.error('Place creation error:', {
          code: placeError.code,
          message: placeError.message,
          details: placeError.details,
          hint: placeError.hint,
        })
        setError(`場所の追加エラー: ${placeError.message}`)
        return
      }

      setPlaceName('')
      setGoogleMapsUrl('')
      setCategoryId(null)
      setMemo('')

      await loadPlaces(couple.id)

      setShowAddPlaceModal(false)
    } finally {
      setPlaceLoading(false)
    }
  }

  // --------------------------------------------------
  // 編集機能
  // --------------------------------------------------

  const startEditing = (place: Place) => {
    setEditingPlaceId(place.id)
    setEditName(place.name)
    setEditGoogleMapsUrl(place.google_maps_url)
    setEditingCategoryId(place.category_id)
    setEditMemo(place.memo ?? '')
    setError('')
  }

  const updatePlace = async (place: Place) => {
    setError('')

    if (!editName.trim()) {
      setError('場所の名前を入力してください。')
      return
    }

    if (editName.trim().length > 50) {
      setError('場所の名前は50文字以内で入力してください。')
      return
    }

    if (editMemo.trim().length > 200) {
      setError('メモは200文字以内で入力してください。')
      return
    }

    const { error: updateError } = await supabase
      .from('places')
      .update({
        name: editName.trim(),
        google_maps_url: editGoogleMapsUrl.trim(),
        category_id: editingCategoryId,
        memo: editMemo.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', place.id)
      .eq('added_by', userId)

    if (updateError) {
      console.error('Place update error:', updateError)
      setError(`場所の更新エラー: ${updateError.message}`)
      return
    }

    setEditingPlaceId(null)
    await loadPlaces(place.couple_id)
  }

  const deletePlace = async (place: Place) => {
    const confirmed = window.confirm(
      `「${place.name}」を削除しますか？`
    )

    if (!confirmed) {
      return
    }

    setError('')

    const { error: deleteError } = await supabase
      .from('places')
      .delete()
      .eq('id', place.id)
      .eq('added_by', userId)
      .select()

    if (deleteError) {
      setError(`場所の削除エラー: ${deleteError.message}`)
      return
    }

    await loadPlaces(place.couple_id)
  }

  // --------------------------------------------------
  // 評価保存
  // --------------------------------------------------

  const saveReview = async (place: Place) => {
    setError('')

    if (rating < 1 || rating > 5) {
      setError('評価を選択してください。')
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

    const { error: reviewError } = await supabase
      .from('place_reviews')
      .upsert(
        {
          place_id: place.id,
          user_id: user.id,
          rating,
          review: review.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'place_id,user_id',
        }
      )

    if (reviewError) {
      console.error('Review save error:', reviewError)
      setError(`評価・感想の保存エラー: ${reviewError.message}`)
      return
    }

    setRating(0)
    setReview('')
    setReviewingPlaceId(null)

    await loadPlaces(place.couple_id)

  }

  const getMyReview = (placeId: string) => {
    return reviews.find(
      (review) =>
        review.place_id === placeId &&
        review.user_id === userId
    )
  }



  // --------------------------------------------------
  // 行ったかどうかの切り替え
  // --------------------------------------------------

  const togglePlaceStatus = async (place: Place) => {
    setError('')

    const isVisited = place.status === 'visited'

    const { error: updateError } = await supabase
      .from('places')
      .update({
        status: isVisited ? 'want' : 'visited',
        visited_at: isVisited ? null : new Date().toISOString(),
      })
      .eq('id', place.id)
      .eq('couple_id', place.couple_id)

    if (updateError) {
      console.error('Place status update error:', updateError)
      setError(`ステータス変更エラー: ${updateError.message}`)
      return
    }

    await loadPlaces(place.couple_id)
  }

  const filteredPlaces = places.filter(
    (place) =>
      place.status === placeTab &&
      (categoryFilter === 'すべて' || place.category_id === categoryFilter) &&
      place.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedPlaces = categories
    .map((category) => ({
      category,
      places: filteredPlaces.filter(
        (place) => place.category_id === category.id
      ),
    }))
    .filter((group) => group.places.length > 0)

  console.log('groupedPlaces:', groupedPlaces)

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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-400">
                    共有スペース
                  </p>

                  <h2 className="mt-2 text-xl font-medium text-stone-800">
                    {couple.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSpaceName(couple.name)
                    setShowSpaceSettings(true)
                  }}
                  className="mt-1 text-sm text-stone-400 underline hover:text-stone-600"
                >
                  設定
                </button>
              </div>
            </section>

            {showSpaceSettings && (
              <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-stone-800">
                    共有スペース設定
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowSpaceSettings(false)}
                    className="mt-1 text-sm text-stone-400 underline hover:text-stone-600"
                  >
                    閉じる
                  </button>
                </div>

                <label className="mt-5 block text-sm text-stone-500">
                  スペース名
                </label>

                <input
                  type="text"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                />

                <button
                  type="button"
                  disabled={spaceNameLoading}
                  onClick={async () => {
                    if (!couple || !spaceName.trim()) {
                      return
                    }

                    setSpaceNameLoading(true)
                    setError('')

                    const { error: updateError } = await supabase
                      .from('couples')
                      .update({
                        name: spaceName.trim(),
                      })
                      .eq('id', couple.id)

                    if (updateError) {
                      console.error('Space name update error:', updateError)
                      setError(`スペース名変更エラー: ${updateError.message}`)
                    } else {
                      setCouple({
                        ...couple,
                        name: spaceName.trim(),
                      })

                      setShowSpaceSettings(false)
                    }

                    setSpaceNameLoading(false)
                  }}
                  className="mt-4 rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {spaceNameLoading ? '保存中...' : '保存'}
                </button>

                {!isPartnerConnected && (
                  <div className="mt-6 border-t border-stone-100 pt-6">
                    <p className="text-sm text-stone-500">
                      招待コード
                    </p>

                    <p className="mt-2 font-mono text-lg tracking-widest text-stone-700">
                      {couple?.invite_code}
                    </p>

                    <p className="mt-2 text-xs text-stone-400">
                      このコードを相手に共有してください。
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t border-stone-100 pt-6">
                  <div>
                    <p className="text-sm text-stone-500">
                      カテゴリ
                    </p>

                    <p className="mt-1 text-xs text-stone-400">
                      ふたりで使うカテゴリを追加・削除できます。
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        data-category-id={category.id}
                        className={`rounded-2xl border border-stone-100 bg-stone-50 p-3 transition ${draggingCategoryId === category.id
                          ? 'opacity-50'
                          : ''
                          }`}
                      >
                        {editingCategoryId === category.id ? (
                          <div className="flex w-full items-center gap-2">
                            <input
                              type="text"
                              value={editingCategoryName}
                              maxLength={20}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              autoFocus
                              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                            />

                            <button
                              type="button"
                              onClick={() => updateCategory(category.id)}
                              disabled={categoryLoading}
                              className="shrink-0 rounded-xl bg-stone-800 px-3 py-2 text-sm text-white disabled:opacity-50"
                            >
                              {categoryLoading ? '保存中...' : '保存'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(null)
                                setEditingCategoryName('')
                                setError('')
                              }}
                              disabled={categoryLoading}
                              className="shrink-0 rounded-xl px-3 py-2 text-sm text-stone-500"
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <div className="flex w-full items-center gap-3">
                            {/* ドラッグハンドル */}
                              <div
                                className="shrink-0 touch-none cursor-grab select-none text-stone-300 active:cursor-grabbing"
                                title="ドラッグして並び替え"
                                onPointerDown={(e) => {
                                  if (editingCategoryId === category.id) {
                                    return
                                  }

                                  e.preventDefault()

                                  e.currentTarget.setPointerCapture(e.pointerId)

                                  setDraggingCategoryId(category.id)
                                }}
                                onPointerUp={(e) => {
                                  if (!draggingCategoryId) {
                                    return
                                  }

                                  e.preventDefault()

                                  const target = document
                                    .elementFromPoint(e.clientX, e.clientY)
                                    ?.closest('[data-category-id]') as HTMLElement | null

                                  const targetCategoryId =
                                    target?.dataset.categoryId

                                  if (
                                    targetCategoryId &&
                                    targetCategoryId !== draggingCategoryId
                                  ) {
                                    reorderCategories(
                                      draggingCategoryId,
                                      targetCategoryId
                                    )
                                  }

                                  setDraggingCategoryId(null)
                                }}
                                onPointerCancel={() => {
                                  setDraggingCategoryId(null)
                                }}
                              >
                                ⠿
                              </div>

                            <span className="min-w-0 flex-1 break-words text-sm text-stone-700">
                              {category.name}
                            </span>

                            <div className="flex shrink-0 items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(category.id)
                                  setEditingCategoryName(category.name)
                                  setError('')
                                }}
                                disabled={categoryLoading}
                                className="text-sm text-stone-500 hover:text-stone-800 disabled:opacity-50"
                              >
                                編集
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteCategory(category)}
                                disabled={categoryLoading}
                                className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      maxLength={20}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="新しいカテゴリ"
                      className="min-w-0 flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                    />
                    <button
                      type="button"
                      disabled={categoryLoading || categories.length >= 20}
                      onClick={createCategory}
                      className="shrink-0 rounded-2xl bg-stone-800 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {categories.length >= 20 ? '上限20件' : '追加'}
                    </button>
                  </div>
                </div>
              </section>
            )}


            {/* 場所追加 */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddPlaceModal(true)}
                className="fixed bottom-8 right-5 z-40 rounded-full bg-stone-800 px-5 py-3 text-sm font-medium text-white shadow-lg"
              >
                ＋
              </button>
            </div>

            {/* 場所一覧 */}
            <section className="mt-6">
              <div className="sticky top-0 z-30 py-2">
                {/* 行きたい / 行った */}
                <div className="flex rounded-2xl bg-stone-200 p-1">
                  <button
                    type="button"
                    onClick={() => setPlaceTab('want')}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${placeTab === 'want'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500'
                      }`}
                  >
                    行きたい
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlaceTab('visited')}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${placeTab === 'visited'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500'
                      }`}
                  >
                    行った
                  </button>
                </div>
              </div>

              {/* ← ここに検索欄 */}
              <div className="relative mt-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="場所を検索"
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-400"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400 hover:text-stone-600"
                    aria-label="検索をクリア"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('すべて')}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm ${categoryFilter === 'すべて'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white text-stone-500 border border-stone-200'
                    }`}
                >
                  すべて
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryFilter(category.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm ${categoryFilter === category.id
                      ? 'bg-stone-800 text-white'
                      : 'bg-white text-stone-500 border border-stone-200'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {filteredPlaces.length === 0 ? (
                <div className="mt-4 pb-28">
                  <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
                    <p className="text-sm text-stone-400">
                      {searchQuery.trim()
                        ? `「${searchQuery}」に一致する場所はありません。`
                        : placeTab === 'want'
                          ? 'まだ行きたい場所がありません。'
                          : 'まだ行った場所がありません。'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-6 pb-28">
                  {groupedPlaces.map((group) => (
                    <div key={group.category.id}>
                      <h3 className="mb-3 px-1 text-sm font-medium text-stone-500">
                        {group.category.name}
                      </h3>

                      <div className="space-y-4">
                        {group.places.map((place) => (

                          <div
                            key={place.id}
                            className="relative rounded-3xl bg-white p-6 shadow-sm"
                          >
                            {editingPlaceId === place.id ? (
                              /* 編集モード */
                              <div>
                                <h3 className="text-lg font-medium text-stone-800">
                                  場所を編集
                                </h3>

                                <input
                                  type="text"
                                  value={editName}
                                  maxLength={50}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="場所の名前"
                                  className="mt-5 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                                />

                                <input
                                  type="url"
                                  value={editGoogleMapsUrl}
                                  onChange={(e) => setEditGoogleMapsUrl(e.target.value)}
                                  placeholder="Google Maps URL"
                                  className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                                />

                                <select
                                  value={editingCategoryId ?? ''}
                                  onChange={(e) => setEditingCategoryId(e.target.value || null)}
                                  className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-400"
                                >
                                  <option value="">カテゴリを選択</option>

                                  {categories.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>


                                <textarea
                                  value={editMemo}
                                  onChange={(e) => setEditMemo(e.target.value)}
                                  placeholder="メモ"
                                  rows={3}
                                  maxLength={200}
                                  className="mt-3 w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                                />

                                <div className="mt-4 flex items-center justify-end">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPlaceId(null)}
                                      className="rounded-2xl border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50"
                                    >
                                      キャンセル
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => updatePlace(place)}
                                      className="rounded-2xl bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* 通常表示 */
                              <>
                                <div className="flex items-start gap-4">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="break-words text-lg font-medium text-stone-800">
                                      {place.name}
                                    </h3>

                                    <p className="mt-1 text-xs text-stone-400">
                                      {categories.find(
                                        (category) => category.id === place.category_id
                                      )?.name ?? 'カテゴリなし'}
                                    </p>
                                  </div>

                                  {userId === place.added_by && (
                                    <div data-place-menu className="relative shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenPlaceMenuId(
                                            openPlaceMenuId === place.id ? null : place.id
                                          )
                                        }
                                        className="rounded-full p-2 text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                                        aria-label="場所の操作"
                                      >
                                        ⋯
                                      </button>

                                      {openPlaceMenuId === place.id && (
                                        <div className="absolute right-0 top-11 z-20 w-28 rounded-2xl border border-stone-100 bg-white p-1 shadow-lg">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              startEditing(place)
                                              setOpenPlaceMenuId(null)
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50"
                                          >
                                            編集
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenPlaceMenuId(null)
                                              deletePlace(place)
                                            }}
                                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 hover:bg-red-50"
                                          >
                                            削除
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {place.memo && (
                                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-500">
                                    {place.memo}
                                  </p>
                                )}

                                <div className="mt-4 flex items-center justify-between">
                                  {place.google_maps_url ? (
                                    <a
                                      href={place.google_maps_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm text-stone-500 underline"
                                    >
                                      Google Mapsで見る
                                    </a>
                                  ) : (
                                    <span />
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => togglePlaceStatus(place)}
                                    className="rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
                                  >
                                    {place.status === 'visited' ? '行きたい' : '行った'}
                                  </button>
                                </div>

                                {place.status === 'visited' && place.visited_at && (
                                  <p className="mt-4 text-sm text-stone-400">
                                    訪問日：
                                    {new Date(place.visited_at).toLocaleDateString('ja-JP')}
                                  </p>
                                )}

                                {place.status === 'visited' && (
                                  <>
                                    {reviews
                                      .filter((review) => review.place_id === place.id)
                                      .map((review) => (
                                        <div
                                          key={review.id}
                                          className="mt-5 border-t border-stone-100 pt-5"
                                        >
                                          <p className="text-sm text-stone-400">
                                            {review.user_id === userId ? 'あなたの評価' : '相手の評価'}
                                          </p>

                                          <div className="mt-1 flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <span
                                                key={star}
                                                className={
                                                  star <= review.rating
                                                    ? 'text-amber-400'
                                                    : 'text-stone-200'
                                                }
                                              >
                                                ★
                                              </span>
                                            ))}
                                          </div>

                                          {review.review && (
                                            <p className="mt-2 text-sm leading-6 text-stone-500">
                                              {review.review}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                  </>
                                )}


                                {place.status === 'visited' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const myReview = getMyReview(place.id)

                                      setReviewingPlaceId(place.id)
                                      setRating(myReview?.rating ?? 0)
                                      setReview(myReview?.review ?? '')
                                    }}
                                    className="mt-5 text-sm text-stone-500 underline"
                                  >
                                    {getMyReview(place.id) ? '評価・感想を編集' : '評価・感想を残す'}
                                  </button>
                                )}


                                {place.status === 'visited' &&
                                  reviewingPlaceId === place.id && (
                                    <div className="mt-5 border-t border-stone-100 pt-5">
                                      <p className="text-sm font-medium text-stone-700">
                                        評価
                                      </p>

                                      <div className="mt-2 flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`text-2xl ${star <= rating
                                              ? 'text-amber-400'
                                              : 'text-stone-200'
                                              }`}
                                          >
                                            ★
                                          </button>
                                        ))}
                                      </div>

                                      <textarea
                                        value={review}
                                        onChange={(e) => setReview(e.target.value)}
                                        placeholder="感想を残す"
                                        rows={3}
                                        className="mt-3 w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                                      />

                                      <div className="mt-3 flex justify-end gap-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReviewingPlaceId(null)
                                            setRating(0)
                                            setReview('')
                                          }}
                                          className="text-sm text-stone-400"
                                        >
                                          キャンセル
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => saveReview(place)}
                                          className="rounded-2xl bg-stone-800 px-4 py-2 text-sm font-medium text-white"
                                        >
                                          保存
                                        </button>
                                      </div>
                                    </div>
                                  )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showAddPlaceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowAddPlaceModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-stone-800">
                場所を追加
              </h2>
            </div>

            <input
              type="text"
              value={placeName}
              maxLength={50}
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

            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-400"
            >
              <option value="">カテゴリを選択</option>

              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモ"
              rows={3}
              maxLength={200}
              className="mt-3 w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddPlaceModal(false)}
                className="rounded-2xl border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={createPlace}
                disabled={placeLoading}
                className="rounded-2xl bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {placeLoading ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}

export default Home
