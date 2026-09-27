import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/authStore';
import { useLanguage } from '../context/LanguageContext';
import AppSidebar from './Appsidebar';

const defaultWorkSettings = { sunday_work_allowed: false, standard_day_hours: 10 };

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [workSettings, setWorkSettings] = useState(defaultWorkSettings);
  const [notice, setNotice] = useState('');
  const [savingWorkSettings, setSavingWorkSettings] = useState(false);
  const superAdmin = user?.role_name === 'SUPER_ADMIN';
  const owner = user?.role_name === 'OWNER';

  const load = async () => {
    try {
      if (superAdmin) {
        const response = await api.get('/settings/profile');
        setProfile(response.data?.data || {});
      } else if (owner) {
        const [accountsResponse, workSettingsResponse] = await Promise.all([
          api.get('/settings/accounts'),
          api.get('/work-settings').catch(() => null)
        ]);
        setAccounts(accountsResponse.data?.data || []);
        setWorkSettings(workSettingsResponse?.data?.data || defaultWorkSettings);
      }
    } catch (error) {
      setNotice(error.response?.data?.message || t('settings.loadFailed'));
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await api.put('/settings/profile', profile);
      setNotice(t('settings.saved'));
    } catch (error) {
      setNotice(error.response?.data?.message || t('settings.saveFailed'));
    }
  };

  const saveWorkSettings = async (event) => {
    event.preventDefault();
    setSavingWorkSettings(true);
    try {
      const response = await api.put('/work-settings', {
        sunday_work_allowed: workSettings.sunday_work_allowed,
        standard_day_hours: Number(workSettings.standard_day_hours)
      });
      setWorkSettings(response.data?.data || workSettings);
      setNotice(t('settings.workSaved'));
    } catch (error) {
      setNotice(error.response?.data?.message || t('settings.workSaveFailed'));
    } finally {
      setSavingWorkSettings(false);
    }
  };

  const saveAccount = async (account) => {
    const username = window.prompt(t('settings.newUsername'), account.username);
    if (username === null) return;
    const password = window.prompt(t('settings.newPassword'));
    try {
      await api.put(`/settings/accounts/${account.user_id}`, { username, password });
      setNotice(t('settings.accountUpdated'));
      load();
    } catch (error) {
      setNotice(error.response?.data?.message || t('settings.accountUpdateFailed'));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-700">{t('settings.eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-bold">{t('settings.title')}</h1>
            <p className="mt-2 text-sm text-slate-600">{superAdmin ? t('settings.adminDescription') : t('settings.ownerDescription')}</p>
          </header>

          {notice && <p className="rounded-lg bg-blue-50 p-3 text-blue-900">{notice}</p>}

          {superAdmin && <form onSubmit={saveProfile} className="grid gap-3 rounded-2xl border bg-white p-6">
            <input required value={profile.full_name || ''} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} placeholder={t('settings.fullName')} className="rounded-lg border p-3" />
            <input required value={profile.username || ''} onChange={(event) => setProfile({ ...profile, username: event.target.value })} placeholder={t('settings.username')} className="rounded-lg border p-3" />
            <input value={profile.phone || ''} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder={t('settings.phone')} className="rounded-lg border p-3" />
            <input value={profile.email || ''} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder={t('settings.email')} className="rounded-lg border p-3" />
            <input type="password" value={profile.password || ''} onChange={(event) => setProfile({ ...profile, password: event.target.value })} placeholder={t('settings.password')} className="rounded-lg border p-3" />
            <button className="rounded-lg bg-blue-700 p-3 font-semibold text-white">{t('settings.save')}</button>
          </form>}

          {owner && <>
            <form onSubmit={saveWorkSettings} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{t('settings.workEyebrow')}</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{t('settings.workRules')}</h2>
              <p className="mt-2 text-sm text-slate-600">{t('settings.workRulesHelp')}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <input type="checkbox" checked={Boolean(workSettings.sunday_work_allowed)} onChange={(event) => setWorkSettings({ ...workSettings, sunday_work_allowed: event.target.checked })} className="mt-1 h-5 w-5 accent-blue-600" />
                  <span><b className="block text-slate-900">{t('settings.allowSunday')}</b><span className="mt-1 block text-sm text-slate-600">{t('settings.allowSundayHelp')}</span></span>
                </label>
                <label className="rounded-xl border border-slate-200 p-4 font-semibold text-slate-900">{t('settings.standardHours')}<input required min="1" max="24" step="0.25" type="number" value={workSettings.standard_day_hours ?? 10} onChange={(event) => setWorkSettings({ ...workSettings, standard_day_hours: event.target.value })} className="mt-2 block w-full rounded-lg border p-2" /><span className="mt-2 block text-sm font-normal text-slate-600">{t('settings.standardHoursHelp')}</span></label>
              </div>
              <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950"><b>{t('settings.nightWork')}</b> {t('settings.nightWorkHelp')} <Link to="/night-shifts" className="font-bold underline">{t('settings.nightPlans')}</Link>. {t('settings.nightWorkTail')}</div>
              <button disabled={savingWorkSettings} className="mt-5 rounded-lg bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">{savingWorkSettings ? t('common.loading') : t('settings.saveWork')}</button>
            </form>

            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-5"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{t('settings.accountsEyebrow')}</p><h2 className="mt-1 text-xl font-bold">{t('settings.accountsTitle')}</h2></div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-4">{t('settings.account')}</th><th>{t('settings.role')}</th><th>{t('settings.username')}</th><th>{t('settings.phone')}</th><th className="p-4">{t('settings.action')}</th></tr></thead><tbody>{accounts.map((account) => <tr className="border-t" key={account.user_id}><td className="p-4">{account.employees ? `${account.employees.first_name || ''} ${account.employees.last_name || ''}` : account.food_suppliers?.[0]?.supplier_name}</td><td>{account.roles?.role_name}</td><td>{account.username}</td><td>{account.employees?.phone || account.food_suppliers?.[0]?.phone || '-'}</td><td className="p-4"><button type="button" onClick={() => saveAccount(account)} className="font-semibold text-blue-700">{t('settings.changeLogin')}</button></td></tr>)}{!accounts.length && <tr><td colSpan="5" className="p-6 text-slate-500">{t('settings.noAccounts')}</td></tr>}</tbody></table></div>
            </section>
          </>}
        </div>
      </main>
    </div>
  );
}
