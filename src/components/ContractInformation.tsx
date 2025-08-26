import React from 'react'
import {
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { PageHeader } from './PageHeader'

interface ContractInformationProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

export const ContractInformation: React.FC<ContractInformationProps> = () => {

  // Mock contract data
  const activeContracts = [
    {
      client: 'Acme Corp',
      type: 'Monthly Retainer',
      value: '£2,500',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      autoRenewal: true,
      nextBilling: '2024-02-01'
    },
    {
      client: 'TechStart Inc',
      type: 'Project Based',
      value: '£15,000',
      startDate: '2024-01-15',
      endDate: '2024-06-15',
      status: 'active',
      autoRenewal: false,
      nextBilling: '2024-02-15'
    },
    {
      client: 'Global Dynamics',
      type: 'Monthly Retainer',
      value: '£3,200',
      startDate: '2023-09-01',
      endDate: '2024-08-31',
      status: 'expiring',
      autoRenewal: false,
      nextBilling: '2024-02-01'
    },
    {
      client: 'Digital Solutions',
      type: 'Quarterly Retainer',
      value: '£7,500',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      autoRenewal: true,
      nextBilling: '2024-04-01'
    }
  ]

  const contractAlerts = [
    { client: 'Global Dynamics', message: 'Contract expires in 6 months - renewal required', severity: 'warning', time: '1d ago' },
    { client: 'TechStart Inc', message: 'Project milestone review due', severity: 'info', time: '3d ago' },
    { client: 'Digital Solutions', message: 'Quarterly billing due next week', severity: 'info', time: '5d ago' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-cro-win-strong dark:text-green-400'
      case 'expiring': return 'text-cro-no-impact-strong dark:text-yellow-400'
      case 'expired': return 'text-cro-loss-strong dark:text-red-400'
      default: return 'text-neutral-600 dark:text-neutral-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-cro-win-strong dark:text-green-400" />
      case 'expiring': return <AlertCircle className="h-4 w-4 text-cro-no-impact-strong dark:text-yellow-400" />
      case 'expired': return <XCircle className="h-4 w-4 text-cro-loss-strong dark:text-red-400" />
      default: return <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'text-cro-no-impact-strong dark:text-yellow-400'
      case 'error': return 'text-cro-loss-strong dark:text-red-400'
      default: return 'text-cro-no-impact-strong dark:text-blue-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      <PageHeader
        title="Contract Information"
        subtitle="Manage client contracts, terms, and billing details"
      />

      {/* Active Contracts Overview */}
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-purple-strong" />
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Active Contracts</h2>
            <span className="bg-brand-purple-strong/10 dark:bg-brand-purple-strong/20 text-brand-purple-strong px-3 py-1 rounded-full text-xs font-medium">
              {activeContracts.filter(c => c.status === 'active').length} active
            </span>
          </div>
          <div className="flex items-center gap-3 lg:gap-4 text-xs overflow-x-auto">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-cro-win-strong dark:bg-green-400" />
              <span className="text-neutral-600 dark:text-neutral-300">Active</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-cro-no-impact-strong dark:bg-yellow-400" />
              <span className="text-neutral-600 dark:text-neutral-300">Expiring</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-cro-loss-strong dark:bg-red-400" />
              <span className="text-neutral-600 dark:text-neutral-300">Expired</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeContracts.map((contract, index) => (
            <div key={index} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{contract.client}</h3>
                <div className="flex items-center gap-1">
                  {getStatusIcon(contract.status)}
                  <span className={`text-xs font-medium capitalize ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-medium">{contract.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Value:</span>
                  <span className="font-medium">{contract.value}</span>
                </div>
                <div className="flex justify-between">
                  <span>End Date:</span>
                  <span className="font-medium">{formatDate(contract.endDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto Renewal:</span>
                  <span className={`font-medium ${contract.autoRenewal ? 'text-cro-win-strong dark:text-green-400' : 'text-neutral-600 dark:text-neutral-300'}`}>
                    {contract.autoRenewal ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Contract Summary */}
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="h-5 w-5 text-brand-purple-strong" />
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Financial Summary</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-cro-win-strong dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Total Contract Value</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Active contracts</p>
                </div>
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-white">£28,200</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-cro-no-impact-strong dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Next Billing</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Due this month</p>
                </div>
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-white">£12,700</span>
            </div>
          </div>
        </div>

        {/* Contract Alerts */}
        <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="h-5 w-5 text-cro-no-impact-strong dark:text-yellow-400" />
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Contract Alerts</h2>
            <span className="bg-cro-no-impact-strong/10 dark:bg-yellow-400/10 text-cro-no-impact-strong dark:text-yellow-400 px-3 py-1 rounded-full text-xs font-medium">
              {contractAlerts.length}
            </span>
          </div>
          <div className="space-y-4">
            {contractAlerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div className={getAlertColor(alert.severity)}>
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{alert.client}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{alert.message}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
