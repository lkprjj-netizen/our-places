import type { Category } from '../../types'

type CategorySettingsProps = {
  categories: Category[]

  editingCategoryId: string | null
  setEditingCategoryId: (id: string | null) => void

  editingCategoryName: string
  setEditingCategoryName: (value: string) => void

  newCategoryName: string
  setNewCategoryName: (value: string) => void

  categoryLoading: boolean

  draggingCategoryId: string | null

  onCreateCategory: () => void
  onUpdateCategory: (categoryId: string) => void
  onDeleteCategory: (category: Category) => void

  onDragStart: (
    categoryId: string,
    pointerId: number
  ) => void
}

function CategorySettings({
  categories,

  editingCategoryId,
  setEditingCategoryId,

  editingCategoryName,
  setEditingCategoryName,

  newCategoryName,
  setNewCategoryName,

  categoryLoading,

  draggingCategoryId,

  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,

  onDragStart,
}: CategorySettingsProps) {
  return (
    <div className="mt-6 border-t border-stone-100 pt-6">
      <div>
        <p className="text-sm text-stone-500">
          カテゴリ
        </p>

        <p className="mt-1 text-xs text-stone-400">
          ふたりで使うカテゴリを追加・削除できます。
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            data-category-id={category.id}
            draggable={false}
            className={`rounded-2xl border border-stone-100 bg-stone-50 p-3 transition ${draggingCategoryId === category.id
                ? 'scale-[1.02] opacity-50 shadow-md'
                : ''
              }`}
          >
            {editingCategoryId === category.id ? (
              <div className="flex w-full items-center gap-2">
                <input
                  type="text"
                  value={editingCategoryName}
                  maxLength={20}
                  onChange={(e) =>
                    setEditingCategoryName(e.target.value)
                  }
                  autoFocus
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    onUpdateCategory(category.id)
                  }
                  disabled={categoryLoading}
                  className="shrink-0 rounded-xl bg-stone-800 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {categoryLoading
                    ? '保存中...'
                    : '保存'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCategoryId(null)
                    setEditingCategoryName('')
                  }}
                  disabled={categoryLoading}
                  className="shrink-0 rounded-xl px-3 py-2 text-sm text-stone-500"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex w-full items-center gap-3">
                <div
                  className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    if (
                      editingCategoryId === category.id ||
                      categoryLoading
                    ) {
                      return
                    }

                    e.preventDefault()

                    onDragStart(
                      category.id,
                      e.pointerId
                    )

                    e.currentTarget.setPointerCapture?.(
                      e.pointerId
                    )
                  }}
                >
                  <span className="block px-1 py-1 text-xl leading-none text-stone-300">
                    ⠿
                  </span>
                </div>

                <span className="min-w-0 flex-1 break-words text-sm text-stone-700">
                  {category.name}
                </span>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(category.id)
                      setEditingCategoryName(
                        category.name
                      )
                    }}
                    disabled={categoryLoading}
                    className="text-sm text-stone-500 hover:text-stone-800 disabled:opacity-50"
                  >
                    編集
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onDeleteCategory(category)
                    }
                    disabled={categoryLoading}
                    className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={newCategoryName}
          maxLength={20}
          onChange={(e) =>
            setNewCategoryName(e.target.value)
          }
          placeholder="新しいカテゴリ"
          className="min-w-0 flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
        />

        <button
          type="button"
          disabled={
            categoryLoading ||
            categories.length >= 20
          }
          onClick={onCreateCategory}
          className="shrink-0 rounded-2xl bg-stone-800 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {categories.length >= 20
            ? '上限20件'
            : '追加'}
        </button>
      </div>
    </div>
  )
}

export default CategorySettings
