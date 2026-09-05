import { useEffect, useState } from 'react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import { useOwnerManagerScope } from '../context/OwnerManagerScope'
import AppSidebar from './Appsidebar'

export default function NotificationCenterPage() {
  const { user } = useAuth(); const { managers } = useOwnerManagerScope()
  const [rows, setRows] = useState([]); const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ manager_user_id: '', message: '' }); const role = user?.role_name
  const load = async () => { try { const response = await api.get('/notifications'); setRows(response.data?.data || []) } catch (error) { setNotice(error.response?.data?.message || 'Could not load this management conversation.') } }
  useEffect(() => { load() }, [])
  const send = async (event) => { event.preventDefault(); try { await api.post('/notifications', form); setForm({ ...form, message: '' }); setNotice('Message sent to this management unit.'); load() } catch (error) { setNotice(error.response?.data?.message || 'Could not send message.') } }
  const markRead = async (id) => { try { await api.put(`/notifications/${id}/read`); load() } catch { /* non-essential */ } }
  return <div className="flex min-h-screen bg-slate-50"><AppSidebar /><main className="flex-1 p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Management-unit group chat</p><h1 className="mt-2 text-3xl font-bold">Notifications and messages</h1><p className="mt-2 text-sm text-slate-600">The owner, selected manager, and that manager’s accountant share this conversation. Other managers and accountants cannot access it.</p></header>
    {notice && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
    <form onSubmit={send} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{role === 'OWNER' && <select required value={form.manager_user_id} onChange={(e) => setForm({ ...form, manager_user_id: e.target.value })} className="rounded-lg border p-3"><option value="">Select manager conversation</option>{managers.map((manager) => <option key={manager.user_id} value={manager.user_id}>{manager.name} and accountant</option>)}</select>}<textarea required rows="4" placeholder="Write a message to this management unit…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-lg border p-3"/><button className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800">Send message</button></form>
    <section className="space-y-3">{rows.map((row) => { const mine = row.sender_user_id === user?.user_id; return <article key={row.notification_id} onClick={() => !row.is_read && markRead(row.notification_id)} className={`rounded-xl border p-5 shadow-sm ${mine ? 'border-blue-200 bg-blue-50/70' : !row.is_read ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{mine ? 'You' : row.sender_name}</p><p className="mt-2 whitespace-pre-wrap text-slate-700">{row.message}</p></div><div className="shrink-0 text-right text-xs text-slate-500"><p>{new Date(row.created_at).toLocaleString()}</p><p className="mt-1 font-semibold">{mine ? 'Sent' : row.is_read ? 'Read' : 'New'}</p></div></div></article> })}{!rows.length && <p className="rounded-xl border bg-white p-6 text-slate-500">No messages in this management-unit conversation yet.</p>}</section>
  </div></main></div>
}
