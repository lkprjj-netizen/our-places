import { useState } from 'react'
import PlaceEditForm from './PlaceEditForm'
import ReviewSection from './ReviewSection'

import type {
  Category,
  Place,
  PlaceReview,
} from '../../types'

type PlaceCardProps = {
  place: Place
  categories: Category[]
  userId: string | null
  reviews: PlaceReview[]

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

function PlaceCard({
  place,
  categories,
  userId,
  reviews,

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
}: PlaceCardProps) {
  const [openPlaceMenuId, setOpenPlaceMenuId] = useState<string | null>(null)

  const startEditing = (place: Place) => {
    setEditingPlaceId(place.id)
    setEditName(place.name)
    setEditGoogleMapsUrl(place.google_maps_url)
    setEditingCategoryId(place.category_id)
    setEditMemo(place.memo ?? '')
    setOpenPlaceMenuId(null)
  }

  return (
    <div className="relative rounded-3xl bg-white p-6 shadow-sm">
      {editingPlaceId === place.id ? (
        <PlaceEditForm
          place={place}
          categories={categories}
          onCancel={() => setEditingPlaceId(null)}
          onUpdate={onUpdate}
          editName={editName}
          setEditName={setEditName}
          editGoogleMapsUrl={editGoogleMapsUrl}
          setEditGoogleMapsUrl={setEditGoogleMapsUrl}
          editingCategoryId={editingCategoryId}
          setEditingCategoryId={setEditingCategoryId}
          editMemo={editMemo}
          setEditMemo={setEditMemo}
        />
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
