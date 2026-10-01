import { useState } from 'react'

import type {
  Category,
  Place,
  PlaceReview,
} from '../../types'

type PlaceListProps = {
  filteredPlaces: Place[]
  categories: Category[]
  userId: string | null
  reviews: PlaceReview[]

  placeTab: 'want' | 'visited'
  searchQuery: string

  editingPlaceId: string | null
  setEditingPlaceId: (id: string | null) => void

  onUpdate: (place: Place) => void
  onDelete: (place: Place) => void
  onToggleStatus: (place: Place) => void
  onSaveReview: (
    place: Place,
    rating: number,
    review: string
  ) => Promise<void>

  editName: string
  setEditName: (value: string) => void

  editGoogleMapsUrl: string
  setEditGoogleMapsUrl: (value: string) => void

  editingCategoryId: string | null
  setEditingCategoryId: (value: string | null) => void

  editMemo: string
  setEditMemo: (value: string) => void
}

function PlaceList({
  filteredPlaces,
  categories,
  userId,
  reviews,

  placeTab,
  searchQuery,

  editingPlaceId,
  setEditingPlaceId,

  onUpdate,
  onDelete,
  onToggleStatus,
  onSaveReview,

  editName,
  setEditName,

  editGoogleMapsUrl,
  setEditGoogleMapsUrl,

  editingCategoryId,
  setEditingCategoryId,

  editMemo,
  setEditMemo,
}: PlaceListProps) {
  const [reviewingPlaceId, setReviewingPlaceId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')

  const [openPlaceMenuId, setOpenPlaceMenuId] = useState<string | null>(null)

  const getMyReview = (placeId: string) => {
    return reviews.find(
      (review) =>
        review.place_id === placeId &&
        review.user_id === userId
    )
  }

  const startEditing = (place: Place) => {
    setEditingPlaceId(place.id)
    setEditName(place.name)
    setEditGoogleMapsUrl(place.google_maps_url)
    setEditingCategoryId(place.category_id)
    setEditMemo(place.memo ?? '')
    setOpenPlaceMenuId(null)
  }

  const handleReviewOpen = (place: Place) => {
    const myReview = getMyReview(place.id)

    setReviewingPlaceId(place.id)
    setRating(myReview?.rating ?? 0)
    setReview(myReview?.review ?? '')
  }

  const handleReviewCancel = () => {
    setReviewingPlaceId(null)
    setRating(0)
    setReview('')
  }

  const handleReviewSave = async (place: Place) => {
    await onSaveReview(place, rating, review)

    setReviewingPlaceId(null)
    setRating(0)
    setReview('')
  }

  const groupedPlaces = categories
    .map((category) => ({
      category,
      places: filteredPlaces.filter(
        (place) => place.category_id === category.id
      ),
    }))
    .filter((group) => group.places.length > 0)

  return (
    <>
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
                          onChange={(e) =>
                            setEditName(e.target.value)
                          }
                          placeholder="場所の名前"
                          className="mt-5 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                        />

                        <input
                          type="url"
                          value={editGoogleMapsUrl}
                          onChange={(e) =>
                            setEditGoogleMapsUrl(e.target.value)
                          }
                          placeholder="Google Maps URL"
                          className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                        />

                        <select
                          value={editingCategoryId ?? ''}
                          onChange={(e) =>
                            setEditingCategoryId(
                              e.target.value || null
                            )
                          }
                          className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-400"
                        >
                          <option value="">
                            カテゴリを選択
                          </option>

                          {categories.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ))}
                        </select>

                        <textarea
                          value={editMemo}
                          onChange={(e) =>
                            setEditMemo(e.target.value)
                          }
                          placeholder="メモ"
                          rows={3}
                          maxLength={200}
                          className="mt-3 w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                        />

                        <div className="mt-4 flex items-center justify-end">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPlaceId(null)
                              }
                              className="rounded-2xl border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50"
                            >
                              キャンセル
                            </button>

                            <button
                              type="button"
                              onClick={() => onUpdate(place)}
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
                                (category) =>
                                  category.id ===
                                  place.category_id
                              )?.name ?? 'カテゴリなし'}
                            </p>
                          </div>

                          {userId === place.added_by && (
                            <div
                              data-place-menu
                              className="relative shrink-0"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenPlaceMenuId(
                                    openPlaceMenuId === place.id
                                      ? null
                                      : place.id
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
                                    onClick={() =>
                                      startEditing(place)
                                    }
                                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50"
                                  >
                                    編集
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenPlaceMenuId(null)
                                      onDelete(place)
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
                            onClick={() =>
                              onToggleStatus(place)
                            }
                            className="rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
                          >
                            {place.status === 'visited'
                              ? '行きたい'
                              : '行った'}
                          </button>
                        </div>

                        {place.status === 'visited' &&
                          place.visited_at && (
                            <p className="mt-4 text-sm text-stone-400">
                              訪問日：
                              {new Date(
                                place.visited_at
                              ).toLocaleDateString('ja-JP')}
                            </p>
                          )}

                        {place.status === 'visited' && (
                          <>
                            {reviews
                              .filter(
                                (review) =>
                                  review.place_id === place.id
                              )
                              .map((review) => (
                                <div
                                  key={review.id}
                                  className="mt-5 border-t border-stone-100 pt-5"
                                >
                                  <p className="text-sm text-stone-400">
                                    {review.user_id === userId
                                      ? 'あなたの評価'
                                      : '相手の評価'}
                                  </p>

                                  <div className="mt-1 flex gap-1">
                                    {[1, 2, 3, 4, 5].map(
                                      (star) => (
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
                                      )
                                    )}
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
                            onClick={() =>
                              handleReviewOpen(place)
                            }
                            className="mt-5 text-sm text-stone-500 underline"
                          >
                            {getMyReview(place.id)
                              ? '評価・感想を編集'
                              : '評価・感想を残す'}
                          </button>
                        )}

                        {place.status === 'visited' &&
                          reviewingPlaceId === place.id && (
                            <div className="mt-5 border-t border-stone-100 pt-5">
                              <p className="text-sm font-medium text-stone-700">
                                評価
                              </p>

                              <div className="mt-2 flex gap-1">
                                {[1, 2, 3, 4, 5].map(
                                  (star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() =>
                                        setRating(star)
                                      }
                                      className={`text-2xl ${star <= rating
                                          ? 'text-amber-400'
                                          : 'text-stone-200'
                                        }`}
                                    >
                                      ★
                                    </button>
                                  )
                                )}
                              </div>

                              <textarea
                                value={review}
                                onChange={(e) =>
                                  setReview(e.target.value)
                                }
                                placeholder="感想を残す"
                                rows={3}
                                className="mt-3 w-full resize-none rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
                              />

                              <div className="mt-3 flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={handleReviewCancel}
                                  className="text-sm text-stone-400"
                                >
                                  キャンセル
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReviewSave(place)
                                  }
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
    </>
  )
}

export default PlaceList
