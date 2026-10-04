import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import SpaceSettings from '../components/couple/SpaceSettings'



import type {
  Couple,
  Category,
  Place,
  PlaceReview,
  PlaceVisit,
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
  const [placeVisits, setPlaceVisits] = useState<PlaceVisit[]>([])

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
  const [editingPlaceCategoryId, setEditingPlaceCategoryId] =
    useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [dragPointerId, setDragPointerId] = useState<number | null>(null)
  // ドラッグ中の最新カテゴリ順を保持
  const categoriesRef = useRef<Category[]>([])

  const [showCategorySettings, setShowCategorySettings] = useState(false)

  const [showVisitDateModal, setShowVisitDateModal] = useState(false)
  const [visitDatePlace, setVisitDatePlace] = useState<Place | null>(null)
  const [visitDate, setVisitDate] = useState('')
  const [visitDateLoading, setVisitDateLoading] = useState(false)


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

    const placeIds = (data ?? []).map((place) => place.id)

    if (placeIds.length > 0) {
      const { data: visits, error: visitsError } = await supabase
        .from('place_visits')
        .select('id, place_id, visited_at, created_at')
        .in('place_id', placeIds)
        .order('visited_at', { ascending: false })

      if (visitsError) {
        console.error('Place visits lookup error:', visitsError)
        setError(`訪問履歴の取得エラー: ${visitsError.message}`)
        return
      }

      setPlaceVisits(visits ?? [])
    } else {
      setPlaceVisits([])
    }

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

    if (!editingPlaceCategoryId) {
      setError('カテゴリを選択してください。')
      return
    }

    const { error: updateError } = await supabase
      .from('places')
      .update({
        name: editName.trim(),
        google_maps_url: editGoogleMapsUrl.trim(),
        category_id: editingPlaceCategoryId,
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

    // 「行った」→「行きたい」は即時変更せず確認
    if (place.status === 'visited') {
      const confirmed = window.confirm(
        `「${place.name}」を「行きたい」に戻しますか？`
      )

      if (!confirmed) {
        return
      }

      const {
        data: updatedPlace,
        error: updateError,
      } = await supabase
        .from('places')
        .update({
          status: 'want',
          visited_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', place.id)
        .eq('couple_id', place.couple_id)
        .select('id, status, visited_at')
        .maybeSingle()

      if (updateError) {
        console.error(
          'Place status update error:',
          updateError
        )

        setError(
          `ステータス変更エラー: ${updateError.message}`
        )

        return
      }

      if (!updatedPlace) {
        setError(
          '場所のステータスを変更できませんでした。RLSなどの権限設定を確認してください。'
        )

        return
      }

      await loadPlaces(place.couple_id)

      return
    }

    // 「行きたい」→「行った」は訪問日を入力してから登録
    setVisitDatePlace(place)

    const today = new Date()
    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 10)

    setVisitDate(localDate)
    setShowVisitDateModal(true)
  }

  const saveVisitDate = async () => {
    if (!visitDatePlace || !visitDate) {
      return
    }

    setVisitDateLoading(true)
    setError('')

    try {
      const {
        data: existingVisits,
        error: existingError,
      } = await supabase
        .from('place_visits')
        .select('id, visited_at')
        .eq('place_id', visitDatePlace.id)

      if (existingError) {
        throw new Error(
          `訪問履歴の確認エラー: ${existingError.message}`
        )
      }

      const duplicated = (existingVisits ?? []).some(
        (visit) => {
          const existingDate = new Date(
            visit.visited_at
          )

          const localDate = new Date(
            existingDate.getTime() -
            existingDate.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 10)

          return localDate === visitDate
        }
      )

      if (duplicated) {
        setError(
          'この日はすでに訪問履歴があります。'
        )
        return
      }

      const visitedAt = new Date(
        `${visitDate}T12:00:00`
      ).toISOString()

      const {
        data: insertedVisit,
        error: visitError,
      } = await supabase
        .from('place_visits')
        .insert({
          place_id: visitDatePlace.id,
          visited_at: visitedAt,
        })
        .select('id, place_id, visited_at, created_at')
        .single()

      if (visitError) {
        throw new Error(
          `訪問履歴の保存エラー: ${visitError.message}`
        )
      }

      if (!insertedVisit) {
        throw new Error(
          '訪問履歴を登録できませんでした。'
        )
      }

      /*
       * 「行きたい」→「行った」の操作なので、
       * ここでは明示的に visited にする。
       */
      const { data: updatedPlace, error: placeError } =
        await supabase
          .from('places')
          .update({
            status: 'visited',
            visited_at: visitedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', visitDatePlace.id)
          .eq('couple_id', visitDatePlace.couple_id)
          .select('id, status, visited_at')
          .maybeSingle()

      if (placeError) {
        throw placeError
      }

      if (!updatedPlace) {
        throw new Error(
          '場所のステータスを更新できませんでした。RLSなどの権限設定を確認してください。'
        )
      }

      await loadPlaces(visitDatePlace.couple_id)

      setShowVisitDateModal(false)
      setVisitDatePlace(null)
      setVisitDate('')
    } catch (error) {
      console.error(
        'Save visit date error:',
        error
      )

      setError(
        error instanceof Error
          ? error.message
          : '訪問日の登録に失敗しました。'
      )
    } finally {
      setVisitDateLoading(false)
    }
  }


  const updateVisitDate = async (
    visit: PlaceVisit,
    date: string
  ) => {
    if (!date) {
      setError('訪問日を入力してください。')
      return
    }

    setError('')

    try {
      // 同じ場所に同じ日付の訪問履歴が
      // すでに存在しないかチェック
      const {
        data: existingVisits,
        error: existingError,
      } = await supabase
        .from('place_visits')
        .select('id, visited_at')
        .eq('place_id', visit.place_id)
        .neq('id', visit.id)

      if (existingError) {
        console.error(
          'Existing visits lookup error:',
          existingError
        )

        setError(
          `訪問履歴の確認エラー: ${existingError.message}`
        )

        return
      }

      const duplicated = (existingVisits ?? []).some(
        (item) => {
          const existingDate = new Date(
            item.visited_at
          )

          const localDate = new Date(
            existingDate.getTime() -
            existingDate.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 10)

          return localDate === date
        }
      )

      if (duplicated) {
        setError(
          'この日はすでに訪問履歴があります。'
        )
        return
      }

      const visitedAt = new Date(
        `${date}T12:00:00`
      ).toISOString()

      const {
        data: updatedVisit,
        error: updateError,
      } = await supabase
        .from('place_visits')
        .update({
          visited_at: visitedAt,
        })
        .eq('id', visit.id)
        .select('id, place_id, visited_at, created_at')
        .maybeSingle()

      if (updateError) {
        console.error(
          'Visit date update error:',
          updateError
        )

        setError(
          `訪問日の更新エラー: ${updateError.message}`
        )

        return
      }

      if (!updatedVisit) {
        setError(
          '訪問履歴を更新できませんでした。RLSなどの権限設定を確認してください。'
        )

        return
      }

      /*
       * ここでは places.status を変更しない。
       *
       * 「行きたい」状態で過去の訪問日を修正した場合も、
       * 「行きたい」のままにする。
       *
       * 「行った」状態の場合も、
       * 「行った」のままにする。
       */
      await updatePlaceLatestVisitDate(
        visit.place_id
      )

      if (couple) {
        await loadPlaces(couple.id)
      }
    } catch (error) {
      console.error(
        'Update visit date error:',
        error
      )

      setError(
        error instanceof Error
          ? `訪問日の更新エラー: ${error.message}`
          : '訪問日の更新に失敗しました。'
      )
    }
  }


  const deleteVisit = async (
    visit: PlaceVisit
  ) => {
    const confirmed = window.confirm(
      'この訪問履歴を削除しますか？'
    )

    if (!confirmed) {
      return
    }

    setError('')

    try {
      /*
       * 削除前の places.status を取得する。
       *
       * 「行きたい」状態なら、
       * 訪問履歴を削除しても「行きたい」のまま。
       *
       * 「行った」状態なら、
       * 削除後に訪問履歴が残っているか確認する。
       */
      const {
        data: currentPlace,
        error: currentPlaceError,
      } = await supabase
        .from('places')
        .select('id, status')
        .eq('id', visit.place_id)
        .maybeSingle()

      if (currentPlaceError) {
        console.error(
          'Current place lookup error:',
          currentPlaceError
        )

        setError(
          `場所情報の取得エラー: ${currentPlaceError.message}`
        )

        return
      }

      if (!currentPlace) {
        setError(
          '場所情報を取得できませんでした。'
        )

        return
      }

      const {
        data: deletedVisit,
        error: deleteError,
      } = await supabase
        .from('place_visits')
        .delete()
        .eq('id', visit.id)
        .select('id')
        .maybeSingle()

      if (deleteError) {
        console.error(
          'Visit deletion error:',
          deleteError
        )

        setError(
          `訪問履歴の削除エラー: ${deleteError.message}`
        )

        return
      }

      if (!deletedVisit) {
        setError(
          '訪問履歴を削除できませんでした。RLSなどの権限設定を確認してください。'
        )

        return
      }

      /*
       * 「行きたい」の場合は、
       * 履歴を削除しても status は変更しない。
       */
      if (currentPlace.status === 'want') {
        await updatePlaceLatestVisitDate(
          visit.place_id
        )
      } else {
        /*
         * 「行った」の場合は、
         * 残っている訪問履歴を確認する。
         *
         * 残っていれば「行った」のまま。
         * 0件なら「行きたい」に戻す。
         */
        await updatePlaceLatestVisit(
          visit.place_id
        )
      }

      if (couple) {
        await loadPlaces(couple.id)
      }
    } catch (error) {
      console.error(
        'Delete visit error:',
        error
      )

      setError(
        error instanceof Error
          ? `訪問履歴の削除エラー: ${error.message}`
          : '訪問履歴の削除に失敗しました。'
      )
    }
  }




  const updatePlaceLatestVisit = async (
    placeId: string
  ) => {
    const {
      data: visits,
      error,
    } = await supabase
      .from('place_visits')
      .select('id, place_id, visited_at, created_at')
      .eq('place_id', placeId)
      .order('visited_at', {
        ascending: false,
      })

    if (error) {
      throw error
    }

    const latestVisit = visits?.[0]

    if (!latestVisit) {
      const {
        data,
        error: placeError,
      } = await supabase
        .from('places')
        .update({
          status: 'want',
          visited_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', placeId)
        .select('id, status, visited_at')
        .maybeSingle()

      if (placeError) {
        throw placeError
      }

      if (!data) {
        throw new Error(
          '場所のステータスを更新できませんでした。RLSなどの権限設定を確認してください。'
        )
      }

      return
    }

    const {
      data,
      error: placeError,
    } = await supabase
      .from('places')
      .update({
        status: 'visited',
        visited_at: latestVisit.visited_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', placeId)
      .select('id, status, visited_at')
      .maybeSingle()

    if (placeError) {
      throw placeError
    }

    if (!data) {
      throw new Error(
        '場所のステータスを更新できませんでした。RLSなどの権限設定を確認してください。'
      )
    }
  }

  const updatePlaceLatestVisitDate = async (
    placeId: string
  ) => {
    const {
      data: visits,
      error,
    } = await supabase
      .from('place_visits')
      .select('id, place_id, visited_at, created_at')
      .eq('place_id', placeId)
      .order('visited_at', {
        ascending: false,
      })

    if (error) {
      throw error
    }

    const latestVisit = visits?.[0]

    /*
     * 訪問履歴の日付情報だけを更新する。
     *
     * status は絶対に変更しない。
     */
    const {
      data,
      error: placeError,
    } = await supabase
      .from('places')
      .update({
        visited_at: latestVisit?.visited_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', placeId)
      .select('id, status, visited_at')
      .maybeSingle()

    if (placeError) {
      throw placeError
    }

    if (!data) {
      throw new Error(
        '場所の訪問日を更新できませんでした。RLSなどの権限設定を確認してください。'
      )
    }
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
                onUpdateVisitDate={updateVisitDate}
                onDeleteVisit={deleteVisit}
                editName={editName}
                setEditName={setEditName}
                editGoogleMapsUrl={editGoogleMapsUrl}
                setEditGoogleMapsUrl={setEditGoogleMapsUrl}
                editingPlaceCategoryId={editingPlaceCategoryId}
                setEditingPlaceCategoryId={setEditingPlaceCategoryId}
                editMemo={editMemo}
                setEditMemo={setEditMemo}
                placeVisits={placeVisits}
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

      {showVisitDateModal && visitDatePlace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => {
            if (visitDateLoading) return

            setShowVisitDateModal(false)
            setVisitDatePlace(null)
            setVisitDate('')
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium text-stone-800">
              訪問日を登録
            </h2>

            <p className="mt-2 text-sm text-stone-500">
              「{visitDatePlace.name}」に行った日を選択してください。
            </p>

            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="mt-5 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowVisitDateModal(false)
                  setVisitDatePlace(null)
                  setVisitDate('')
                }}
                disabled={visitDateLoading}
                className="rounded-2xl border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={saveVisitDate}
                disabled={visitDateLoading || !visitDate}
                className="rounded-2xl bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {visitDateLoading ? '保存中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}


    </main>
  )
}

export default Home
