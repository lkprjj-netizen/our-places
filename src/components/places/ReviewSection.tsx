import { useState } from 'react'

import type {
  Place,
  PlaceReview,
} from '../../types'

type ReviewSectionProps = {
  place: Place
  reviews: PlaceReview[]
  userId: string | null
  onSaveReview: (
    place: Place,
    rating: number,
    review: string
  ) => Promise<void>
}

function ReviewSection({
  place,
  reviews,
  userId,
  onSaveReview,
}: ReviewSectionProps) {
  const [isReviewing, setIsReviewing] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')

  const placeReviews = reviews.filter(
    (item) => item.place_id === place.id
  )

  const myReview = reviews.find(
    (item) =>
      item.place_id === place.id &&
      item.user_id === userId
  )

  const handleOpen = () => {
    setIsReviewing(true)
    setRating(myReview?.rating ?? 0)
    setReview(myReview?.review ?? '')
  }

  const handleCancel = () => {
    setIsReviewing(false)
    setRating(0)
    setReview('')
  }

  const handleSave = async () => {
    await onSaveReview(
      place,
      rating,
      review
    )

    setIsReviewing(false)
    setRating(0)
    setReview('')
  }

  return (
    <>
      {placeReviews.map((item) => (
        <div
          key={item.id}
          className="mt-5 border-t border-stone-100 pt-5"
        >
          <p className="text-sm text-stone-400">
            {item.user_id === userId
              ? 'あなたの評価'
              : '相手の評価'}
          </p>

          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={
                  star <= item.rating
                    ? 'text-amber-400'
                    : 'text-stone-200'
                }
              >
                ★
              </span>
            ))}
          </div>

          {item.review && (
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {item.review}
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleOpen}
        className="mt-5 text-sm text-stone-500 underline"
      >
        {myReview
          ? '評価・感想を編集'
          : '評価・感想を残す'}
      </button>

      {isReviewing && (
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
              onClick={handleCancel}
              className="text-sm text-stone-400"
            >
              キャンセル
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-2xl bg-stone-800 px-4 py-2 text-sm font-medium text-white"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ReviewSection
