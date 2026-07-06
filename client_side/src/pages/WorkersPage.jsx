import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, UserX } from 'lucide-react'
import { getWorkers, deactivateWorker } from '../api/worker.api'
import CreateWorkerModal from '../components/CreateWorkerModal'
import EditWorkerModal from '../components/EditWorkerModal'

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editWorker, setEditWorker] = useState(null)

  const loadWorkers = async () => {
    setLoading(true)
    try {
      const res = await getWorkers()
      setWorkers(res.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load workers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkers()
  }, [])

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this worker?')) return
    try {
      await deactivateWorker(id)
      toast.success('Worker deactivated')
      loadWorkers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate worker')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Workers</h1>
            <p className="text-slate-400 mt-1">Manage employees and their accounts.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
          >
            <Plus size={16} />
            Register Worker
          </button>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 shadow-xl overflow-x-auto">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading workers…</p>
          ) : workers.length === 0 ? (
            <p className="text-slate-400 text-sm">No workers found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left py-3 px-3 font-semibold text-slate-300">Name</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-300">Position</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-300">Department</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-300">Phone</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-300">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/20">
                {workers.map((worker) => (
                  <tr key={worker.employee_id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 text-slate-100">
                      {worker.first_name} {worker.last_name}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{worker.positions?.position_name || '—'}</td>
                    <td className="py-3 px-3 text-slate-300">{worker.departments?.department_name || '—'}</td>
                    <td className="py-3 px-3 text-slate-300">{worker.phone}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        worker.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-slate-700/40 text-slate-300'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 flex items-center gap-3">
                      <button
                        onClick={() => setEditWorker(worker)}
                        className="text-cyan-400 hover:text-cyan-300 transition"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(worker.employee_id)}
                        className="text-red-400 hover:text-red-300 transition"
                        title="Deactivate"
                      >
                        <UserX size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateWorkerModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          loadWorkers()
        }}
      />

      <EditWorkerModal
        isOpen={!!editWorker}
        worker={editWorker}
        onClose={() => setEditWorker(null)}
        onSuccess={() => {
          setEditWorker(null)
          loadWorkers()
        }}
      />
    </div>
  )
}