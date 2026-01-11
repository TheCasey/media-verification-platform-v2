import { Link, Outlet, useNavigate } from 'react-router-dom'

export default function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-white grid place-items-center text-sm font-semibold">
              MV
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Media Verification</div>
              <div className="text-xs text-slate-500">Admin</div>
            </div>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <Link to="/admin/dashboard" className="text-slate-700 hover:text-slate-900">
              Dashboard
            </Link>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              onClick={() => navigate('/admin/login')}
              type="button"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}


