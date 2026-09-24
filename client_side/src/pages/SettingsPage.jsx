import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/authStore';
import AppSidebar from './Appsidebar';

const defaultWorkSettings = { sunday_work_allowed: false, standard_day_hours: 10 };

export default function SettingsPage() {
  const { user } = useAuth();
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
      setNotice(error.response?.data?.message || 'Could not load settings.');
    }
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await api.put('/settings/profile', profile);
      setNotice('Super Admin settings saved.');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not save settings.');
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
      setNotice('Work calendar settings saved. Attendance and payroll will now use these rules.');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not save work calendar settings.');
    } finally {
      setSavingWorkSettings(false);
    }
  };

  const saveAccount = async (account) => {
    const username = window.prompt('New username:', account.username);
    if (username === null) return;
    const password = window.prompt('New password (leave blank to keep the current password):');
    try {
      await api.put(`/settings/accounts/${account.user_id}`, { username, password });
      setNotice('Account login updated.');
      load();
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not update account.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-700">Secure account and operations settings</p>
            <h1 className="mt-2 text-3xl font-bold">Settings</h1>
            <p className="mt-2 text-sm text-slate-600">{superAdmin ? 'Update your Super Admin profile and password.' : 'Owner controls the company work calendar, night-shift plans, and company login accounts.'}</p>
          </header>

          {notice && <p className="rounded-lg bg-blue-50 p-3 text-blue-900">{notice}</p>}

          {superAdmin && <form onSubmit={saveProfile} className="grid gap-3 rounded-2xl border bg-white p-6">
            <input required value={profile.full_name || ''} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} placeholder="Full name" className="rounded-lg border p-3" />
            <input required value={profile.username || ''} onChange={(event) => setProfile({ ...profile, username: event.target.value })} placeholder="Username" className="rounded-lg border p-3" />
            <input value={profile.phone || ''} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Phone" className="rounded-lg border p-3" />
            <input value={profile.email || ''} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="Email" className="rounded-lg border p-3" />
            <input type="password" value={profile.password || ''} onChange={(event) => setProfile({ ...profile, password: event.target.value })} placeholder="New password (8+ characters)" className="rounded-lg border p-3" />
            <button className="rounded-lg bg-blue-700 p-3 font-semibold text-white">Save settings</button>
          </form>}

          {owner && <>
            <form onSubmit={saveWorkSettings} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Work calendar and attendance</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Company work rules</h2>
              <p className="mt-2 text-sm text-slate-600">These are company-wide rules. They preserve existing attendance; they only control new attendance and payroll calculations.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <input type="checkbox" checked={Boolean(workSettings.sunday_work_allowed)} onChange={(event) => setWorkSettings({ ...workSettings, sunday_work_allowed: event.target.checked })} className="mt-1 h-5 w-5 accent-blue-600" />
                  <span><b className="block text-slate-900">Allow Sunday work</b><span className="mt-1 block text-sm text-slate-600">When enabled, Sunday attendance can be recorded and worked Sunday shifts are included in payroll. A two-week payroll can therefore have 13 or 14 paid days.</span></span>
                </label>
                <label className="rounded-xl border border-slate-200 p-4 font-semibold text-slate-900">Standard day hours<input required min="1" max="24" step="0.25" type="number" value={workSettings.standard_day_hours ?? 10} onChange={(event) => setWorkSettings({ ...workSettings, standard_day_hours: event.target.value })} className="mt-2 block w-full rounded-lg border p-2" /><span className="mt-2 block text-sm font-normal text-slate-600">Manual attendance uses: actual hours ÷ standard hours × normal daily rate.</span></label>
              </div>
              <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950"><b>Night work:</b> set the times and rate increase/decrease for each Manager in <Link to="/night-shifts" className="font-bold underline">Night Shift Plans</Link>. Accountants can then record a separate day and night shift for the same worker.</div>
              <button disabled={savingWorkSettings} className="mt-5 rounded-lg bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">{savingWorkSettings ? 'Saving…' : 'Save company work rules'}</button>
            </form>

            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="border-b p-5"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Company accounts</p><h2 className="mt-1 text-xl font-bold">Manager, accountant, and supplier logins</h2></div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-4">Account</th><th>Role</th><th>Username</th><th>Phone</th><th className="p-4">Action</th></tr></thead><tbody>{accounts.map((account) => <tr className="border-t" key={account.user_id}><td className="p-4">{account.employees ? `${account.employees.first_name || ''} ${account.employees.last_name || ''}` : account.food_suppliers?.[0]?.supplier_name}</td><td>{account.roles?.role_name}</td><td>{account.username}</td><td>{account.employees?.phone || account.food_suppliers?.[0]?.phone || '-'}</td><td className="p-4"><button type="button" onClick={() => saveAccount(account)} className="font-semibold text-blue-700">Change login</button></td></tr>)}{!accounts.length && <tr><td colSpan="5" className="p-6 text-slate-500">No company accounts found.</td></tr>}</tbody></table></div>
            </section>
          </>}
        </div>
      </main>
    </div>
  );
}
