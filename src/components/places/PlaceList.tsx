import PlaceCard from './PlaceCard'

import type {
  Category,
  Place,
  PlaceReview,
  PlaceVisit,
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

  onUpdateVisitDate: (
    visit: PlaceVisit,
    date: string
  ) => Promise<void>

  onDeleteVisit: (
    visit: PlaceVisit
  ) => Promise<void>

  // 以下はそのまま
  editName: string
  setEditName: (value: string) => void

  editGoogleMapsUrl: string
  setEditGoogleMapsUrl: (value: string) => void

  editingPlaceCategoryId: string | null
  setEditingPlaceCategoryId: (value: string | null) => void

  editMemo: string
  setEditMemo: (value: string) => void

  placeVisits: PlaceVisit[]
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

  placeVisits,
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
                {group.places.map((place) => {
                  const sortedPlaceVisits = placeVisits
                    .filter((visit) => visit.place_id === place.id)
                    .sort(
                      (a, b) =>
                        new Date(a.visited_at).getTime() -
                        new Date(b.visited_at).getTime()
                    )

                  return (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      categories={categories}
                      userId={userId}
                      reviews={reviews}
                      placeVisits={sortedPlaceVisits}
                      editingPlaceId={editingPlaceId}
                      setEditingPlaceId={setEditingPlaceId}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onToggleStatus={onToggleStatus}
                      onSaveReview={onSaveReview}
                      onUpdateVisitDate={onUpdateVisitDate}
                      onDeleteVisit={onDeleteVisit}
                      editName={editName}
                      setEditName={setEditName}
                      editGoogleMapsUrl={editGoogleMapsUrl}
                      setEditGoogleMapsUrl={setEditGoogleMapsUrl}
                      editingPlaceCategoryId={editingPlaceCategoryId}
                      setEditingPlaceCategoryId={setEditingPlaceCategoryId}
                      editMemo={editMemo}
                      setEditMemo={setEditMemo}
                    />

                  )
                })}

              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default PlaceList
