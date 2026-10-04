import { useState } from 'react'
import PlaceEditForm from './PlaceEditForm'
import ReviewSection from './ReviewSection'

import type {
  Category,
  Place,
  PlaceReview,
  PlaceVisit,
} from '../../types'

type PlaceCardProps = {
  place: Place
  categories: Category[]
  userId: string | null
  reviews: PlaceReview[]
  placeVisits: PlaceVisit[]

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

  onUpdateVisitDate: (
    visit: PlaceVisit,
    date: string
  ) => Promise<void>

  onDeleteVisit: (
    visit: PlaceVisit
  ) => Promise<void>

  editName: string
  setEditName: (value: string) => void

  editGoogleMapsUrl: string
  setEditGoogleMapsUrl: (value: string) => void

  editingPlaceCategoryId: string | null
  setEditingPlaceCategoryId: (value: string | null) => void


  editMemo: string
  setEditMemo: (value: string) => void
}

function PlaceCard({
  place,
  categories,
  userId,
  reviews,
  placeVisits,

  editingPlaceId,
  setEditingPlaceId,

  onUpdate,
  onDelete,
  onToggleStatus,


  onSaveReview,
  onUpdateVisitDate,
  onDeleteVisit,

  editName,
  setEditName,

  editGoogleMapsUrl,
  setEditGoogleMapsUrl,

  editingPlaceCategoryId,
  setEditingPlaceCategoryId,


  editMemo,
  setEditMemo,
}: PlaceCardProps) {
  const [openPlaceMenuId, setOpenPlaceMenuId] =
    useState<string | null>(null)

  const [editingVisitId, setEditingVisitId] =
    useState<string | null>(null)

  const [isEditingVisits, setIsEditingVisits] =
    useState(false)


  const [editingVisitDate, setEditingVisitDate] =
    useState('')

  const startEditing = (place: Place) => {
    setEditingPlaceId(place.id)
    setEditName(place.name)
    setEditGoogleMapsUrl(place.google_maps_url)
    setEditingPlaceCategoryId(place.category_id)
    setEditMemo(place.memo ?? '')
    setOpenPlaceMenuId(null)
  }



  const formatVisitDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      'ja-JP'
    )
  }

  const getLocalDateValue = (date: string) => {
    const parsed = new Date(date)

    const localDate = new Date(
      parsed.getTime() -
      parsed.getTimezoneOffset() * 60000
    )

    return localDate.toISOString().slice(0, 10)
  }

  const startEditingVisit = (
    visit: PlaceVisit
  ) => {
    setEditingVisitId(visit.id)
    setEditingVisitDate(
      getLocalDateValue(visit.visited_at)
    )
  }

  const cancelEditingVisit = () => {
    setEditingVisitId(null)
    setEditingVisitDate('')
  }

  const saveEditingVisit = async (
    visit: PlaceVisit
  ) => {
    if (!editingVisitDate) {
      return
    }

    await onUpdateVisitDate(
      visit,
      editingVisitDate
    )

    setEditingVisitId(null)
    setEditingVisitDate('')
  }

  return (
    <div className="relative rounded-3xl bg-white p-6 shadow-sm">
      {editingPlaceId === place.id ? (
        <PlaceEditForm
          place={place}
          categories={categories}
          onCancel={() =>
            setEditingPlaceId(null)
          }
          onUpdate={onUpdate}
          editName={editName}
          setEditName={setEditName}
          editGoogleMapsUrl={
            editGoogleMapsUrl
          }
          setEditGoogleMapsUrl={
            setEditGoogleMapsUrl
          }
          editingPlaceCategoryId={
            editingPlaceCategoryId
          }
          setEditingPlaceCategoryId={
            setEditingPlaceCategoryId
          }
          editMemo={editMemo}
          setEditMemo={setEditMemo}
        />
      ) : (
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

          {/* 訪問履歴 */}
          {placeVisits.length > 0 && (
            <div className="mt-5 border-t border-stone-100 pt-4">

              {/* 見出し */}
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-stone-400">
                  訪問履歴
                </p>

                {!isEditingVisits ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingVisits(true)
                      setEditingVisitId(null)
                      setEditingVisitDate('')
                    }}
                    className="text-xs text-stone-400 underline"
                  >
                    編集
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingVisits(false)
                      setEditingVisitId(null)
                      setEditingVisitDate('')
                    }}
                    className="text-xs text-stone-400 underline"
                  >
                    戻す
                  </button>
                )}
              </div>

              {/* 訪問履歴一覧 */}
              <div className="space-y-2">
                {placeVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-3 py-2"
                  >
                    {isEditingVisits && editingVisitId === visit.id ? (
                      <>
                        {/* 日付編集 */}
                        <input
                          type="date"
                          value={editingVisitDate}
                          onChange={(e) =>
                            setEditingVisitDate(e.target.value)
                          }
                          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                        />

                        {/* 編集中の操作 */}
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              saveEditingVisit(visit)
                            }
                            className="text-xs text-stone-600 underline"
                          >
                            保存
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onDeleteVisit(visit)
                            }
                            className="text-xs text-red-400 underline"
                          >
                            削除
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditingVisit}
                            className="text-xs text-stone-400 underline"
                          >
                            戻す
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 通常時・編集モード時の日付 */}
                        <span className="text-sm text-stone-500">
                          {formatVisitDate(visit.visited_at)}
                        </span>

                        {/* 編集モード時だけ個別操作を表示 */}
                        {isEditingVisits && (
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEditingVisit(visit)
                              }
                              className="text-xs text-stone-400 underline"
                            >
                              編集
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onDeleteVisit(visit)
                              }
                              className="text-xs text-red-400 underline"
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


          {place.status === 'visited' && (
            <ReviewSection
              place={place}
              reviews={reviews}
              userId={userId}
              onSaveReview={onSaveReview}
            />
          )}
        </>
      )}
    </div>
  )
}

export default PlaceCard
