import { useOwnerManagerScope } from '../context/OwnerManagerScope'
import { useAuth } from '../context/authStore'
import { useLanguage } from '../context/LanguageContext'

export default function OwnerManagerSelector({ compact = false }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { managerId, managers, setManagerId, loadingManagers } = useOwnerManagerScope()
  if (user?.role_name !== 'OWNER') return null
  return (
    <label className={`block text-sm font-medium text-slate-700 ${compact ? '' : 'min-w-56'}`}>
      {t('ownerManagerSelector.label')}
      <select value={managerId} onChange={(event) => setManagerId(event.target.value)} disabled={loadingManagers} className="mt-1 block w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-amber-400">
        <option value="">{t('ownerManagerSelector.allManagers')}</option>
        {managers.map((manager) => <option key={manager.user_id} value={manager.user_id}>{manager.name}</option>)}
      </select>
    </label>
  )
}
