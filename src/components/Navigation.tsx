import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeToggleIcon } from './ThemeToggle'
import {
  Home,
  LogOut,
  User,
  Users,
  Menu,
  X,
  Clock,
  Calendar,
  CalendarDays,
  FileText,
  ChevronDown,
  ChevronRight,
  Building,
  Building2,
  TrendingUp,
  DollarSign,
  Wrench,
  CalendarX,
  Heart,
  ExternalLink,
  Activity,
  Bell,
  MessageSquare,
  Database,
  PanelLeftClose,
  PanelLeft,
  Settings
} from 'lucide-react'

interface NavigationSubItem {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  roles: string[]
  comingSoon?: boolean
  nextWeek?: boolean
  externalUrl?: string
}

interface NavigationItem {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  roles: string[]
  isExpandable?: boolean
  subItems?: NavigationSubItem[]
}

interface NavigationProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    avatar?: string
    isImpersonating?: boolean
  }
  activeTab: string
  onLogout?: () => void
  isMobileMenuOpen?: boolean
  onMobileMenuToggle?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const Navigation: React.FC<NavigationProps> = ({
  currentUser = { name: 'Demo User', role: 'SLT' },
  activeTab,
  onLogout,
  isMobileMenuOpen = false,
  onMobileMenuToggle,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]) // Default collapsed
  const navigate = useNavigate()

  // Load expanded state from localStorage on component mount
  useEffect(() => {
    const savedExpandedMenus = localStorage.getItem('navigation-expanded-menus')
    if (savedExpandedMenus) {
      try {
        const parsed = JSON.parse(savedExpandedMenus)
        if (Array.isArray(parsed)) {
          setExpandedMenus(parsed)
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, [])

  // Auto-expand parent section when navigating to sub-pages
  useEffect(() => {
    const navigationItems = getNavigationItems()
      .filter(item => item.roles.includes(currentUser.role))
      .map(item => ({
        ...item,
        subItems: item.subItems?.filter(subItem => subItem.roles.includes(currentUser.role))
      }))

    // Find which parent section contains the active tab
    const parentSection = navigationItems.find(item =>
      item.subItems?.some(subItem => subItem.id === activeTab)
    )

    if (parentSection && !expandedMenus.includes(parentSection.id)) {
      setExpandedMenus(prev => {
        const newExpandedMenus = [...prev, parentSection.id]

        // Save to localStorage
        try {
          localStorage.setItem('navigation-expanded-menus', JSON.stringify(newExpandedMenus))
        } catch {
          // Ignore localStorage errors
        }

        return newExpandedMenus
      })
    }
  }, [activeTab, expandedMenus, currentUser.role])

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => { window.removeEventListener('resize', checkScreenSize); }
  }, [])

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        const sidebar = document.getElementById('mobile-sidebar')
        if (sidebar && !sidebar.contains(event.target as Node)) {
          onMobileMenuToggle?.()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => { document.removeEventListener('mousedown', handleClickOutside); }
    }
    // Return empty cleanup function when condition is not met
    return () => {}
  }, [isMobileMenuOpen, isMobile, onMobileMenuToggle])
    // Navigation items with nested structure
  const getNavigationItems = (): NavigationItem[] => {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['SLT', 'manager', 'team_member'] },
      // { id: 'executive-dashboard', label: 'Executive Dashboard', icon: TrendingUp, roles: ['SLT', 'manager'] },
      {
        id: 'time',
        label: 'Time',
        icon: Clock,
        roles: ['SLT', 'manager', 'team_member'],
        isExpandable: true,
        subItems: [
          { id: 'time-today', label: 'Today View', icon: Calendar, roles: ['SLT', 'manager'] },
          { id: 'time-week', label: 'Week View', icon: CalendarDays, roles: ['SLT', 'manager', 'team_member'] },
          { id: 'time-logs', label: 'All Time Logs', icon: FileText, roles: ['SLT', 'manager', 'team_member'] }
        ]
      },

      {
        id: 'clients',
        label: 'Clients',
        icon: Building,
        roles: ['SLT', 'manager'],
        isExpandable: true,
        subItems: [
          { id: 'clients-credits', label: 'Client Credits', icon: TrendingUp, roles: ['SLT', 'manager'] },
          { id: 'clients-health', label: 'Health Tracker', icon: Activity, roles: ['SLT', 'manager'] }
        ]
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: Users,
        roles: ['SLT'],
        isExpandable: true,
        subItems: [
          { id: 'admin-clients', label: 'Client Management', icon: Building, roles: ['SLT'] },
          { id: 'admin-notifications', label: 'Notification Management', icon: Bell, roles: ['SLT'] },
          { id: 'admin-users', label: 'User Management', icon: Users, roles: ['SLT'] },
          { id: 'admin-pods', label: 'Pod Management', icon: Building2, roles: ['SLT'] },
          { id: 'admin-feedback', label: 'User Feedback', icon: MessageSquare, roles: ['SLT'] },
          { id: 'admin-pulse-leadership', label: 'Team Pulse Trends', icon: TrendingUp, roles: ['SLT'] },

        ]
      },
      {
        id: 'tools',
        label: 'Tools',
        icon: Wrench,
        roles: ['SLT', 'manager', 'team_member'],
        isExpandable: true,
        subItems: [
          { id: 'tools-timeoff', label: 'Book Time Off', icon: CalendarX, roles: ['SLT', 'manager', 'team_member'], comingSoon: true },
          { id: 'tools-pulse', label: 'Daily Pulse Check', icon: Heart, roles: ['SLT', 'manager', 'team_member'] },
          { id: 'tools-sync', label: 'Time Log Sync', icon: Database, roles: ['SLT', 'manager'] },
          { id: 'tools-load-test', label: 'Database Load Testing', icon: Activity, roles: ['SLT'] },
          { id: 'tools-outline', label: 'Outline (Notion)', icon: ExternalLink, roles: ['SLT', 'manager', 'team_member'], externalUrl: 'https://outline.workshub.agency/', nextWeek: true }
        ]
      }
    ]
  }

  const allNavigationItems = getNavigationItems()

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems
    .filter(item => item.roles.includes(currentUser.role))
    .map(item => ({
      ...item,
      subItems: item.subItems?.filter(subItem => subItem.roles.includes(currentUser.role))
    }))

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SLT':
        return 'bg-brand-purple-strong/10 dark:bg-purple-400/20 text-brand-purple-strong dark:text-purple-400'
      case 'manager':
        return 'bg-brand-green-strong/10 dark:bg-green-400/20 text-brand-green-strong dark:text-green-400'
      case 'team_member':
        return 'bg-cro-no-impact-strong/10 dark:bg-blue-400/20 text-cro-no-impact-strong dark:text-blue-400'
      default:
        return 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300'
    }
  }

  const handleNavClick = (tabId: string, item?: NavigationSubItem, parentItem?: NavigationItem) => {
    // Handle external links
    if (item?.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
      if (isMobile && onMobileMenuToggle) {
        onMobileMenuToggle() // Close mobile menu after navigation
      }
      return
    }

    // Skip navigation for coming soon and next week items
    if (item?.comingSoon || item?.nextWeek) {
      return
    }

    // Map tab IDs to routes
    const routeMap: Record<string, string> = {
      'dashboard': '/app/dashboard',
      'executive-dashboard': '/app/executive-dashboard',
      'time-today': '/app/time/today',
      'time-week': '/app/time/week',
      'time-logs': '/app/time/logs',
      'billing': '/app/billing/clients',
      'clients-credits': '/app/clients/credits',
      'clients-health': '/app/clients/health',
      'admin-clients': '/app/admin/clients',
      'admin-notifications': '/app/admin/notifications',
      'admin-users': '/app/admin/users',
      'admin-pods': '/app/admin/pods',
      'admin-feedback': '/app/admin/feedback',
      'admin-pulse-leadership': '/app/admin/pulse-leadership',

      'settings': '/app/settings',
      'tools-timeoff': '/app/tools/timeoff',
      'tools-pulse': '/app/tools/pulse',
      'tools-sync': '/app/tools/sync',
      'tools-load-test': '/app/tools/load-test',
    }

    const route = routeMap[tabId] || '/app/dashboard'
    navigate(route)

    if (isMobile && onMobileMenuToggle) {
      onMobileMenuToggle() // Close mobile menu after navigation
    }
  }

  const toggleMenu = (menuId: string) => {
    // If sidebar is collapsed and trying to expand a menu, expand sidebar first
    if (isCollapsed && !expandedMenus.includes(menuId)) {
      onToggleCollapse?.()
      // Then expand the menu after a short delay to allow sidebar animation
      setTimeout(() => {
        setExpandedMenus(prev => {
          const newExpandedMenus = [...prev, menuId]
          try {
            localStorage.setItem('navigation-expanded-menus', JSON.stringify(newExpandedMenus))
          } catch {
            // Ignore localStorage errors
          }
          return newExpandedMenus
        })
      }, 150)
    } else {
      setExpandedMenus(prev => {
        const newExpandedMenus = prev.includes(menuId)
          ? prev.filter(id => id !== menuId)
          : [...prev, menuId]

        // Save to localStorage
        try {
          localStorage.setItem('navigation-expanded-menus', JSON.stringify(newExpandedMenus))
        } catch {
          // Ignore localStorage errors
        }

        return newExpandedMenus
      })
    }
  }

  // Mobile Top Bar
  const MobileTopBar = () => (
    <div className="lg:hidden bg-neutral-white dark:bg-black border-b border-neutral-200 dark:border-neutral-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Menu className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
        </button>
        <Logo size="md" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-full flex items-center justify-center">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-brand-purple-strong" />
          )}
        </div>
      </div>
    </div>
  )

  // Sidebar Content (shared between mobile and desktop)
  const SidebarContent = () => (
    <>
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-200 dark:border-neutral-900">
        <div className="flex items-center justify-between">
          <div className={isCollapsed && !isMobile ? 'hidden' : ''}>
            <Logo size="md" />
          </div>
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeft className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              ) : (
                <PanelLeftClose className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
              )}
            </button>
          )}
          {isMobile && (
            <button
              onClick={onMobileMenuToggle}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors lg:hidden"
            >
              <X className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Items - Scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-custom">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const isExpanded = expandedMenus.includes(item.id)
          const hasActiveSubItem = item.subItems?.some(subItem => activeTab === subItem.id)

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.isExpandable) {
                    toggleMenu(item.id)
                  } else {
                    handleNavClick(item.id, undefined, item)
                  }
                }}
                className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  isActive || hasActiveSubItem
                    ? 'bg-brand-purple-strong/10 dark:bg-purple-400/20 text-brand-purple-strong dark:text-white border border-brand-purple-strong/20'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white'
                }`}
                title={isCollapsed && !isMobile ? item.label : undefined}
                data-nav-id={item.id}
              >
                <Icon className={`h-5 w-5 ${(isActive || hasActiveSubItem) ? 'text-brand-purple-strong dark:text-purple-400' : ''}`} />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.isExpandable && (
                      <div className="transition-transform duration-200">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </button>

              {/* Sub-items */}
              {item.isExpandable && item.subItems && isExpanded && !isCollapsed && (
                <div className="ml-4 mt-2 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon
                    const isSubActive = activeTab === subItem.id
                    const isComingSoon = subItem.comingSoon
                    const isNextWeek = subItem.nextWeek
                    const isExternal = subItem.externalUrl

                    return (
                      <button
                        key={subItem.id}
                        onClick={() => { handleNavClick(subItem.id, subItem); }}
                        disabled={isComingSoon || isNextWeek}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-all duration-200 relative ${
                          isSubActive
                            ? 'bg-brand-purple-strong/10 dark:bg-purple-400/20 text-brand-purple-strong dark:text-white border border-brand-purple-strong/20'
                            : isComingSoon || isNextWeek
                            ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                        data-nav-id={subItem.id}
                      >
                        <SubIcon className="h-4 w-4" />
                        <span className="text-sm font-medium flex-1">{subItem.label}</span>
                        {isComingSoon && (
                          <span className="text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-full font-medium">
                            Coming Soon
                          </span>
                        )}
                        {isNextWeek && !isComingSoon && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium">
                            Coming Soon
                          </span>
                        )}
                        {isExternal && !isComingSoon && !isNextWeek && (
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

      </nav>

      {/* User Profile Section - Fixed */}
      <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-900">
        <div className={`${isCollapsed && !isMobile ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-3'} p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 dark:border dark:border-neutral-800`}>
          {/* User Info Row */}
          <div className={`flex ${isCollapsed && !isMobile ? 'flex-col items-center gap-2' : 'items-center gap-3'} w-full`}>
            <div className="w-10 h-10 bg-brand-purple-strong/10 dark:bg-purple-400/20 rounded-full flex items-center justify-center flex-shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-brand-purple-strong dark:text-purple-400" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium text-neutral-900 dark:text-white break-words leading-tight">
                  {currentUser.name}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${getRoleBadge(currentUser.role)}`}>
                    {currentUser.role}
                  </div>
                  {currentUser.isImpersonating && (
                    <div className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 animate-pulse">
                      Impersonating
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons Row */}
          <div className={`flex ${isCollapsed && !isMobile ? 'flex-col' : 'flex-row justify-center'} items-center gap-1 ${!isCollapsed ? 'w-full pt-2 border-t border-neutral-200 dark:border-neutral-700' : ''}`}>
            <button
              onClick={() => { handleNavClick('settings'); }}
              className="p-2 rounded-lg transition-all duration-200 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <ThemeToggleIcon />
            <button
              onClick={onLogout}
              className="p-2 rounded-lg transition-all duration-200 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-cro-loss-strong dark:hover:text-cro-loss-strong"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Top Bar */}
      <MobileTopBar />

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex bg-neutral-white dark:bg-black border-r border-neutral-200 dark:border-neutral-900 ${isCollapsed ? 'w-20' : 'w-64'} flex-col h-screen transition-all duration-300`}>
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
          <div
            id="mobile-sidebar"
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-neutral-white dark:bg-black border-r border-neutral-200 dark:border-neutral-900 flex flex-col transform transition-transform duration-300 ease-in-out"
          >
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
