import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-500">Access denied</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">You don’t have permission to view this page.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Your account is signed in, but it does not have the required role for this section.
          Please return to the correct portal or sign in with the right account.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to Admin Login
          </Link>
          <Link
            to="/owner/login"
            className="inline-flex items-center justify-center rounded-3xl border border-amber-500 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            Go to Owner Login
          </Link>
        </div>
      </div>
    </div>
  )
}
