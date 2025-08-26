import type { OnboardingStep } from '../../store/slices/onboardingSlice'

// Common steps shared across all roles
const commonSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to WorksHub!',
    description: 'Let\'s take a quick tour to help you get familiar with the platform. This will only take a few minutes.',
    placement: 'center',
    showSkip: true,
    showNext: true
  },
  {
    id: 'navigation',
    title: 'Navigation Menu',
    description: 'Use this sidebar to navigate between different sections of the app. You can collapse it for more space.',
    target: 'nav',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'theme-toggle',
    title: 'Dark Mode',
    description: 'Prefer working at night? Toggle between light and dark themes here.',
    target: '[aria-label*="mode"]',
    placement: 'top',
    showSkip: true,
    showNext: true,
    showPrev: true
  }
]

// Team member specific steps
const teamMemberSteps: OnboardingStep[] = [
  ...commonSteps,
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'This is your personal dashboard where you can see your active tasks, recent time entries, and important metrics.',
    target: '[data-nav-id="dashboard"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'time-tracking',
    title: 'Time Tracking',
    description: 'Track your time on different tasks and projects. Click here to start a timer or log time manually.',
    target: '[data-nav-id="time"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'today-view',
    title: 'Today View',
    description: 'See what you\'ve worked on today and quickly start timers for your current tasks.',
    target: '[data-nav-id="time-today"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'week-view',
    title: 'Week View',
    description: 'Get an overview of your weekly time entries and track your progress.',
    target: '[data-nav-id="time-week"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'tools-section',
    title: 'Helpful Tools',
    description: 'Access useful tools like booking time off, daily pulse checks, and our knowledge base.',
    target: '[data-nav-id="tools"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'pulse-check',
    title: 'Daily Pulse Check',
    description: 'Share how you\'re feeling each day. This helps leadership understand team wellness and workload.',
    target: '[data-nav-id="tools-pulse"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'time-off',
    title: 'Book Time Off',
    description: 'Planning a vacation? Request time off directly through the platform.',
    target: '[data-nav-id="tools-timeoff"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'That\'s everything you need to know to get started. If you need help, check out our knowledge base or reach out to your manager.',
    placement: 'center',
    showSkip: false,
    showNext: true,
    showPrev: true
  }
]

// Manager specific steps
const managerSteps: OnboardingStep[] = [
  ...commonSteps,
  {
    id: 'dashboard',
    title: 'Management Dashboard',
    description: 'Your dashboard shows team performance, active projects, and key metrics for your pod.',
    target: '[data-nav-id="dashboard"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'time-tracking',
    title: 'Team Time Management',
    description: 'Monitor your team\'s time entries, review timesheets, and ensure accurate client billing.',
    target: '[data-nav-id="time"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'all-logs',
    title: 'Time Log Overview',
    description: 'Review and manage all time entries from your team. You can filter, export, and analyze time data here.',
    target: '[data-nav-id="time-logs"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'clients-section',
    title: 'Client Management',
    description: 'Track client health, monitor retainer usage, and ensure client satisfaction.',
    target: '[data-nav-id="clients"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'retainer-usage',
    title: 'Retainer Tracking',
    description: 'Monitor how clients are using their monthly retainer hours and identify potential upsell opportunities.',
    target: '[data-nav-id="clients-retainer"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'client-health',
    title: 'Client Health Scores',
    description: 'Track client satisfaction with our traffic light system. Green means healthy, amber needs attention, red is critical.',
    target: '[data-nav-id="clients-health"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'tools-section',
    title: 'Management Tools',
    description: 'Access tools for team management, including pulse check reviews and time sync utilities.',
    target: '[data-nav-id="tools"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'time-sync',
    title: 'Time Log Sync',
    description: 'Sync time entries with ClickUp to ensure all project data stays up to date.',
    target: '[data-nav-id="tools-sync"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'complete',
    title: 'Ready to Lead!',
    description: 'You now have all the tools to effectively manage your team and clients. Remember to check the client health scores regularly!',
    placement: 'center',
    showSkip: false,
    showNext: true,
    showPrev: true
  }
]

// SLT (Senior Leadership Team) specific steps
const sltSteps: OnboardingStep[] = [
  ...commonSteps,
  {
    id: 'dashboard',
    title: 'Executive Dashboard',
    description: 'Your dashboard provides a comprehensive overview of agency performance, team health, and client status.',
    target: '[data-nav-id="dashboard"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'admin-section',
    title: 'Administration Hub',
    description: 'Full control over users, clients, pods, and system settings. This is your command center.',
    target: '[data-nav-id="admin"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'client-management',
    title: 'Client Administration',
    description: 'Add new clients, set retainer amounts, manage billing cycles, and track overall client portfolio health.',
    target: '[data-nav-id="admin-clients"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Add team members, assign roles, manage permissions, and handle user impersonation for support.',
    target: '[data-nav-id="admin-users"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'pod-management',
    title: 'Pod Configuration',
    description: 'Organize your teams into pods, assign managers, and balance workloads across the agency.',
    target: '[data-nav-id="admin-pods"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'notification-management',
    title: 'System Notifications',
    description: 'Create and manage system-wide announcements, feature updates, and important notices for all users.',
    target: '[data-nav-id="admin-notifications"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'pulse-trends',
    title: 'Team Wellness Analytics',
    description: 'Monitor team morale trends, identify burnout risks, and track overall agency wellness metrics.',
    target: '[data-nav-id="admin-pulse-leadership"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'user-feedback',
    title: 'Feedback Management',
    description: 'Review user feedback, feature requests, and bug reports to guide platform improvements.',
    target: '[data-nav-id="admin-feedback"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'clients-overview',
    title: 'Client Portfolio',
    description: 'Get detailed insights into client performance, retainer utilization, and relationship health.',
    target: '[data-nav-id="clients"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'time-management',
    title: 'Agency Time Analytics',
    description: 'Deep dive into time tracking data, billable hours, and resource allocation across all teams.',
    target: '[data-nav-id="time"]',
    placement: 'right',
    showSkip: true,
    showNext: true,
    showPrev: true
  },
  {
    id: 'complete',
    title: 'Welcome to Leadership!',
    description: 'You have full access to all platform features. Use these tools to drive agency growth and team success. The admin section is your primary workspace.',
    placement: 'center',
    showSkip: false,
    showNext: true,
    showPrev: true
  }
]

export const getOnboardingSteps = (role: 'SLT' | 'manager' | 'team_member'): OnboardingStep[] => {
  switch (role) {
    case 'SLT':
      return sltSteps
    case 'manager':
      return managerSteps
    case 'team_member':
      return teamMemberSteps
    default:
      return teamMemberSteps
  }
}