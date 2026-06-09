import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  BarChart3,
  AlertTriangle,
  Download,
  LogOut,
  Menu,
  ChevronLeft,
  Trophy,
  MessageSquare,
  Brain,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  BookOpen,
  UserCog,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore, useUIStore } from '@/store'

const menuItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/students', label: '学员档案', icon: Users },
  { path: '/coaches', label: '教练管理', icon: UserCog },
  { path: '/scheduling', label: '课程排班', icon: Calendar },
  { path: '/attendance', label: '签到打卡', icon: CheckSquare },
  { path: '/statistics', label: '学时统计', icon: BarChart3 },
  { path: '/alerts', label: '学时提醒', icon: AlertTriangle },
  {
    label: '迭代功能',
    icon: Trophy,
    children: [
      { path: '/coach-performance', label: '教练绩效', icon: Trophy },
      { path: '/evaluations', label: '教学评估', icon: MessageSquare },
      { path: '/student-analysis', label: '学情分析', icon: Brain },
      { path: '/violations', label: '违规监管', icon: ShieldAlert },
      { path: '/coach-ledger', label: '工作台账', icon: BookOpen },
    ],
  },
  { path: '/export', label: '记录导出', icon: Download },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const navigate = useNavigate()
  const [openMenus, setOpenMenus] = useState<string[]>(['迭代功能'])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } flex-shrink-0 bg-[var(--primary)] text-white transition-all duration-300 flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <span className="text-lg font-semibold tracking-wide">学时管理</span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) =>
            item.children && !sidebarCollapsed ? (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors text-white/70 hover:bg-white/10 hover:text-white`}
                >
                  <item.icon size={20} />
                  <span className="text-sm flex-1 text-left">{item.label}</span>
                  {openMenus.includes(item.label) ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                {openMenus.includes(item.label) && (
                  <div className="mt-1 space-y-1 ml-2">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                            isActive
                              ? 'bg-white/20 text-white font-medium'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        <child.icon size={18} />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path!}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`
                }
              >
                <item.icon size={20} />
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span className="text-sm">退出登录</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-[var(--border)] flex-shrink-0">
          <h1 className="text-lg font-semibold text-[var(--text)]">驾校学员学时管理系统</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">
              {user?.name || user?.username}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {user?.role === 'admin' ? '管理员' : user?.role === 'coach' ? '教练' : '学员'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
