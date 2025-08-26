import React, { useEffect, useState, useCallback } from 'react'
import { Button } from './Button'
import {
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { clientService } from '../services/clientService'

interface ContractInformationProps {
  currentUser?: {
    name: string
    role: 'team_member' | 'manager' | 'SLT'
    email?: string
  }
}

interface ContractInfo {
  client: string
  clientId: number
  type: string
  value: string
  startDate: string
  endDate: string
  status: 'active' | 'expiring' | 'expired'
  autoRenewal: boolean
  nextBilling: string
  monthlyHours: number
}

// This is an example component showing how to integrate real credit ledger data
export const ContractInformationExample: React.FC<ContractInformationProps> = () => {
  const currentTime = new Date()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contracts, setContracts] = useState<ContractInfo[]>([])
  const [contractAlerts, setContractAlerts] = useState<{ client: string; message: string; type: string; severity: string; time: string }[]>([])
  const [totalContractValue, setTotalContractValue] = useState(0)
  const [nextBillingAmount, setNextBillingAmount] = useState(0)

  const fetchContractData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all active clients from credit ledger
      const clients = await clientService.getClients(true)

      // Transform client data into contract information
      const contractsData: ContractInfo[] = []
      const alerts: { client: string; message: string; type: string; severity: string; time: string }[] = []
      let totalValue = 0
      let billingThisMonth = 0

      clients.forEach(client => {
        // Determine contract status based on end date
        let status: 'active' | 'expiring' | 'expired' = 'active'
        const endDate = client.contract_end_date ? new Date(client.contract_end_date) : null
        const today = new Date()
        const sixMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())

        if (endDate) {
          if (endDate < today) {
            status = 'expired'
          } else if (endDate < sixMonthsFromNow) {
            status = 'expiring'
            alerts.push({
              client: client.name,
              message: `Contract expires on ${formatDate(client.contract_end_date!)} - renewal required`,
              type: 'warning',
              severity: 'warning',
              time: 'now'
            })
          }
        }

        // Calculate contract value (example: £150/hour)
        const hourlyRate = 150
        const monthlyValue = client.monthly_hours * hourlyRate
        totalValue += monthlyValue

        // Check if billing is due this month
        const currentDay = today.getDate()
        if (client.reset_date <= currentDay + 7) {
          billingThisMonth += monthlyValue
          if (client.reset_date <= currentDay + 7 && client.reset_date > currentDay) {
            alerts.push({
              client: client.name,
              message: `Monthly billing due on day ${client.reset_date}`,
              type: 'info',
              severity: 'info',
              time: 'now'
            })
          }
        }

        contractsData.push({
          client: client.name,
          clientId: client.id,
          type: 'Monthly Retainer',
          value: `£${monthlyValue.toLocaleString()}`,
          startDate: client.created_at,
          endDate: client.contract_end_date || 'Ongoing',
          status,
          autoRenewal: !client.contract_end_date, // Assume auto-renewal if no end date
          nextBilling: `Day ${client.reset_date} of month`,
          monthlyHours: client.monthly_hours
        })
      })

      setContracts(contractsData)
      setContractAlerts(alerts)
      setTotalContractValue(totalValue)
      setNextBillingAmount(billingThisMonth)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContractData()
  }, [fetchContractData])

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

  if (loading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-brand-purple-strong animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">Loading contract data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-cro-loss-strong dark:text-red-400 mx-auto mb-4" />
          <p className="text-neutral-900 dark:text-white font-medium mb-2">Error loading data</p>
          <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={fetchContractData}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-medium text-neutral-900 dark:text-white">Contract Information</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1">Manage client contracts, terms, and billing details</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchContractData}
            disabled={loading}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="text-left sm:text-right">
            <div className="text-neutral-600 dark:text-neutral-300 text-sm">
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </div>
            <div className="text-xl lg:text-2xl font-medium text-neutral-900 dark:text-white">
              {currentTime.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Contracts Overview */}
      <div className="bg-neutral-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-900 p-4 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-purple-strong" />
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white">Active Contracts</h2>
            <span className="bg-brand-purple-strong/10 dark:bg-brand-purple-strong/20 text-brand-purple-strong px-3 py-1 rounded-full text-xs font-medium">
              {contracts.filter(c => c.status === 'active').length} active
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
          {contracts.map((contract, index) => (
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
                  <span className="font-medium">{contract.value}/month</span>
                </div>
                <div className="flex justify-between">
                  <span>Hours:</span>
                  <span className="font-medium">{contract.monthlyHours}h/month</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing:</span>
                  <span className="font-medium">{contract.nextBilling}</span>
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
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Monthly recurring</p>
                </div>
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-white">£{totalContractValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-cro-no-impact-strong dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Next Billing</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Due within 7 days</p>
                </div>
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-white">£{nextBillingAmount.toLocaleString()}</span>
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
            {contractAlerts.length > 0 ? (
              contractAlerts.map((alert, index) => (
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
              ))
            ) : (
              <div className="text-center p-4">
                <CheckCircle className="h-8 w-8 text-cro-win-strong dark:text-green-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-300">No contract alerts at this time</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
