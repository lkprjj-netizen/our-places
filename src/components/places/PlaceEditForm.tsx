import type { Category, Place } from '../../types'

type PlaceEditFormProps = {
  place: Place
  categories: Category[]

  onCancel: () => void
  onUpdate: (place: Place) => void

  editName: string
  setEditName: (value: string) => void

  editGoogleMapsUrl: string
  setEditGoogleMapsUrl: (value: string) => void

  editingCategoryId: string | null
  setEditingCategoryId: (value: string | null) => void

  editMemo: string
  setEditMemo: (value: string) => void
}

function PlaceEditForm({
  place,
  categories,

  onCancel,
  onUpdate,

  editName,
  setEditName,

  editGoogleMapsUrl,
  setEditGoogleMapsUrl,

  editingCategoryId,
  setEditingCategoryId,

  editMemo,
  setEditMemo,
}: PlaceEditFormProps) {
  return (
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
            onClick={onCancel}
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
  )
}

export default PlaceEditForm
