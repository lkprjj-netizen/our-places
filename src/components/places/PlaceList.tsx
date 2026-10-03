import PlaceCard from './PlaceCard'

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
                  <PlaceCard
                    key={place.id}
                    place={place}
                    categories={categories}
                    userId={userId}
                    reviews={reviews}
                    editingPlaceId={editingPlaceId}
                    setEditingPlaceId={setEditingPlaceId}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                    onSaveReview={onSaveReview}
                    editName={editName}
                    setEditName={setEditName}
                    editGoogleMapsUrl={editGoogleMapsUrl}
                    setEditGoogleMapsUrl={setEditGoogleMapsUrl}
                    editingCategoryId={editingCategoryId}
                    setEditingCategoryId={setEditingCategoryId}
                    editMemo={editMemo}
                    setEditMemo={setEditMemo}
                  />
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
