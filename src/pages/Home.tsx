import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import SpaceSettings from '../components/couple/SpaceSettings'



import type {
  Couple,
  Category,
  Place,
  PlaceReview,
} from '../types'

import PlaceList from '../components/places/PlaceList'

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

  const [reviews, setReviews] = useState<PlaceReview[]>([])

  const [placeTab, setPlaceTab] = useState<'want' | 'visited'>('want')
  const [searchQuery, setSearchQuery] = useState('')

  const [categoryFilter, setCategoryFilter] = useState('すべて')

  const [showSpaceSettings, setShowSpaceSettings] = useState(false)
  const [spaceName, setSpaceName] = useState('')
  const [spaceNameLoading, setSpaceNameLoading] = useState(false)

  const [isPartnerConnected, setIsPartnerConnected] = useState(false)
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [dragPointerId, setDragPointerId] = useState<number | null>(null)
  // ドラッグ中の最新カテゴリ順を保持
  const categoriesRef = useRef<Category[]>([])

  const [showCategorySettings, setShowCategorySettings] = useState(false)


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

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )
    }
  }, [])


  useEffect(() => {
    if (!draggingCategoryId || dragPointerId === null) {
      return
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== dragPointerId) {
        return
      }

      e.preventDefault()

      const target = document.elementFromPoint(
        e.clientX,
        e.clientY
      ) as HTMLElement | null

      const targetCategoryElement =
        target?.closest<HTMLElement>('[data-category-id]')

      if (!targetCategoryElement) {
        return
      }

      const targetCategoryId =
        targetCategoryElement.dataset.categoryId

      if (!targetCategoryId) {
        return
      }

      if (targetCategoryId === draggingCategoryId) {
        return
      }

      const currentCategories = categoriesRef.current

      const currentIndex = currentCategories.findIndex(
        (item) => item.id === draggingCategoryId
      )

      const targetIndex = currentCategories.findIndex(
        (item) => item.id === targetCategoryId
      )

      if (
        currentIndex === -1 ||
        targetIndex === -1
      ) {
        return
      }

      const reordered = [...currentCategories]

      const [dragged] = reordered.splice(
        currentIndex,
        1
      )

      reordered.splice(
        targetIndex,
        0,
        dragged
      )

      const nextCategories = reordered.map(
        (item, index) => ({
          ...item,
          sort_order: index + 1,
        })
      )

      categoriesRef.current = nextCategories
      setCategories(nextCategories)
    }

    const handlePointerUp = async (e: PointerEvent) => {
      if (e.pointerId !== dragPointerId) {
        return
      }

      e.preventDefault()

      const finalCategories = [
        ...categoriesRef.current,
      ]

      setDraggingCategoryId(null)
      setDragPointerId(null)

      if (finalCategories.length === 0) {
        return
      }

      setCategoryLoading(true)
      setError('')

      try {
        const results = await Promise.all(
          finalCategories.map((category, index) =>
            supabase
              .from('categories')
              .update({
                sort_order: index + 1,
              })
              .eq('id', category.id)
              .eq('couple_id', category.couple_id)
          )
        )

        const failed = results.find(
          (result) => result.error
        )

        if (failed?.error) {
          throw failed.error
        }

        // 保存成功後にrefも正規化
        const savedCategories =
          finalCategories.map((category, index) => ({
            ...category,
            sort_order: index + 1,
          }))

        categoriesRef.current = savedCategories
        setCategories(savedCategories)
      } catch (error) {
        console.error(
          'Category reorder error:',
          error
        )

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
      }
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== dragPointerId) {
        return
      }

      // DBには保存せず、サーバー上の順番に戻す
      setDraggingCategoryId(null)
      setDragPointerId(null)

      if (couple) {
        loadCategories(couple.id)
      }
    }

    window.addEventListener(
      'pointermove',
      handlePointerMove,
      { passive: false }
    )

    window.addEventListener(
      'pointerup',
      handlePointerUp
    )

    window.addEventListener(
      'pointercancel',
      handlePointerCancel
    )

    return () => {
      window.removeEventListener(
        'pointermove',
        handlePointerMove
      )

      window.removeEventListener(
        'pointerup',
        handlePointerUp
      )

      window.removeEventListener(
        'pointercancel',
        handlePointerCancel
      )
    }
  }, [
    draggingCategoryId,
    dragPointerId,
    couple,
  ])


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

    const nextCategories = data ?? []

    categoriesRef.current = nextCategories
    setCategories(nextCategories)
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

  const saveReview = async (
    place: Place,
    rating: number,
    review: string
  ) => {
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

    await loadPlaces(place.couple_id)
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
              <SpaceSettings
                couple={couple}
                spaceName={spaceName}
                setSpaceName={setSpaceName}
                spaceNameLoading={spaceNameLoading}
                isPartnerConnected={isPartnerConnected}

                onClose={() => setShowSpaceSettings(false)}

                onSave={async () => {
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
                    console.error(
                      'Space name update error:',
                      updateError
                    )

                    setError(
                      `スペース名変更エラー: ${updateError.message}`
                    )
                  } else {
                    setCouple({
                      ...couple,
                      name: spaceName.trim(),
                    })

                    setShowSpaceSettings(false)
                  }

                  setSpaceNameLoading(false)
                }}
              />
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
                    : 'border border-stone-200 bg-white text-stone-500'
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
                      : 'border border-stone-200 bg-white text-stone-500'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}

                {/* カテゴリ管理 */}
                <button
                  type="button"
                  onClick={() => setShowCategorySettings(true)}
                  className="shrink-0 rounded-full px-4 py-2 text-sm border border-stone-200 bg-white text-stone-500"
                  aria-label="カテゴリを管理"
                >
                  設定
                </button>
              </div>

              <PlaceList
                filteredPlaces={filteredPlaces}
                categories={categories}
                userId={userId}
                reviews={reviews}
                placeTab={placeTab}
                searchQuery={searchQuery}
                editingPlaceId={editingPlaceId}
                setEditingPlaceId={setEditingPlaceId}
                onUpdate={updatePlace}
                onDelete={deletePlace}
                onToggleStatus={togglePlaceStatus}
                onSaveReview={saveReview}
                editName={editName}
                setEditName={setEditName}
                editGoogleMapsUrl={editGoogleMapsUrl}
                setEditGoogleMapsUrl={setEditGoogleMapsUrl}
                editingCategoryId={editingCategoryId}
                setEditingCategoryId={setEditingCategoryId}
                editMemo={editMemo}
                setEditMemo={setEditMemo}
              />


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

      {showCategorySettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowCategorySettings(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-stone-800">
                カテゴリを管理
              </h2>

              <button
                type="button"
                onClick={() => setShowCategorySettings(false)}
                className="text-sm text-stone-400"
              >
                閉じる
              </button>
            </div>

            {/* カテゴリ追加 */}
            <div className="mt-5 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                maxLength={20}
                placeholder="新しいカテゴリ"
                className="min-w-0 flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
              />

              <button
                type="button"
                onClick={createCategory}
                disabled={categoryLoading}
                className="shrink-0 rounded-2xl bg-stone-800 px-4 py-3 text-sm text-white disabled:opacity-50"
              >
                追加
              </button>
            </div>

            {/* カテゴリ一覧 */}
            <div className="mt-5 space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  data-category-id={category.id}
                  className={`rounded-2xl border border-stone-100 bg-stone-50 p-3 ${draggingCategoryId === category.id
                    ? 'opacity-50'
                    : ''
                    }`}
                >
                  {editingCategoryId === category.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) =>
                          setEditingCategoryName(e.target.value)
                        }
                        maxLength={20}
                        className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                      />

                      <button
                        type="button"
                        onClick={() => updateCategory(category.id)}
                        disabled={categoryLoading}
                        className="shrink-0 rounded-xl bg-stone-800 px-3 py-2 text-xs text-white disabled:opacity-50"
                      >
                        保存
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null)
                          setEditingCategoryName('')
                        }}
                        className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500"
                      >
                        戻す
                      </button>
                    </div>
                  ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="shrink-0 cursor-grab select-none touch-none text-stone-300 active:cursor-grabbing"
                            aria-label="カテゴリを並び替え"
                            onPointerDown={(e) => {
                              if (editingCategoryId === category.id) {
                                return
                              }

                              e.preventDefault()

                              setDraggingCategoryId(category.id)
                              setDragPointerId(e.pointerId)

                              categoriesRef.current = [...categories]
                            }}
                          >
                            ⋮⋮
                          </span>

                          <span className="min-w-0 truncate text-sm text-stone-700">
                            {category.name}
                          </span>
                        </div>

                        <div className="flex shrink-0 gap-2">

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            setEditingCategoryId(category.id)
                            setEditingCategoryName(category.name)
                          }}
                          className="text-xs text-stone-400 underline"
                        >
                          編集
                        </button>

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => deleteCategory(category)}
                          disabled={categoryLoading}
                          className="text-xs text-red-400 underline disabled:opacity-50"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </main>
  )
}

export default Home
