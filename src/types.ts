export type Couple = {
  id: string
  name: string
  invite_code: string | null
}

export type Category = {
  id: string
  couple_id: string
  name: string
  sort_order: number
}

export type Place = {
  id: string
  couple_id: string
  name: string
  google_maps_url: string
  sns_url: string | null
  category_id: string
  memo: string | null
  status: string
  added_by: string
  visited_at: string | null
  created_at: string
}

export type PlaceReview = {
  id: string
  place_id: string
  user_id: string
  rating: number
  review: string | null
}

export type PlaceListProps = {
  places: Place[]
  categories: Category[]
  userId: string | null
  reviews: PlaceReview[]
  onUpdate: (place: Place) => void
  onDelete: (place: Place) => void
  onToggleStatus: (place: Place) => void
  onSaveReview: (place: Place) => void
}

export type PlaceVisit = {
  id: string
  place_id: string
  visited_at: string
  created_at: string
}