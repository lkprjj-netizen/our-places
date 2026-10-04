import type { Couple } from '../../types'

type SpaceSettingsProps = {
  couple: Couple

  spaceName: string
  setSpaceName: (value: string) => void
  spaceNameLoading: boolean

  isPartnerConnected: boolean

  onClose: () => void
  onSave: () => void
}

function SpaceSettings({
  couple,

  spaceName,
  setSpaceName,
  spaceNameLoading,

  isPartnerConnected,

  onClose,
  onSave,
}: SpaceSettingsProps) {
  return (
    <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-stone-800">
          共有スペース設定
        </h3>

        <button
          type="button"
          onClick={onClose}
          className="mt-1 text-sm text-stone-400 underline hover:text-stone-600"
        >
          閉じる
        </button>
      </div>

      <label className="mt-5 block text-sm text-stone-500">
        スペース名
      </label>

      <input
        type="text"
        value={spaceName}
        onChange={(e) => setSpaceName(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-stone-400"
      />

      <button
        type="button"
        disabled={spaceNameLoading}
        onClick={onSave}
        className="mt-4 rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {spaceNameLoading ? '保存中...' : '保存'}
      </button>

      {!isPartnerConnected && (
        <div className="mt-6 border-t border-stone-100 pt-6">
          <p className="text-sm text-stone-500">
            招待コード
          </p>

          <p className="mt-2 font-mono text-lg tracking-widest text-stone-700">
            {couple.invite_code}
          </p>

          <p className="mt-2 text-xs text-stone-400">
            このコードを相手に共有してください。
          </p>
        </div>
      )}
    </section>
  )
}

export default SpaceSettings