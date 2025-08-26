import React, { useState, useEffect } from 'react'
import { Clock, TrendingUp, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { creditService } from '../services/creditService'
import type { CreditSummary, CreditTransaction } from '../services/creditService'
import { PageHeader } from './PageHeader'
import { LoadingSpinner } from './LoadingSpinner'
import { Button } from './Button'

interface CreditDashboardProps {
  currentUser?: {
    role: 'team_member' | 'manager' | 'SLT'
  }
}

export const CreditDashboard: React.FC<CreditDashboardProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<CreditSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<CreditSummary | null>(null)
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false)
  const [addCreditsForm, setAddCreditsForm] = useState({
    hours: '',
    description: ''
  })
  const [addingCredits, setAddingCredits] = useState(false)

  useEffect(() => {
    loadCreditsSummary()
  }, [])

  const loadCreditsSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await creditService.getCreditsSummary(true)
      setClients(response.clients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredits = async () => {
    if (!selectedClient || !addCreditsForm.hours || !addCreditsForm.description) return

    try {
      setAddingCredits(true)
      await creditService.addCredits({
        client_id: selectedClient.client_id,
        hours: parseFloat(addCreditsForm.hours),
        description: addCreditsForm.description
      })
      
      // Reload data and close modal
      await loadCreditsSummary()
      setShowAddCreditsModal(false)
      setAddCreditsForm({ hours: '', description: '' })
      setSelectedClient(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credits')
    } finally {
      setAddingCredits(false)
    }
  }

  const formatHours = (hours: number): string => {
    return `${hours.toFixed(1)}h`
  }

  const getStatusColor = (client: CreditSummary): string => {
    if (client.is_overdrawn) return 'text-red-600 dark:text-red-400'
    if (client.balance_hours < 5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getStatusIcon = (client: CreditSummary) => {
    if (client.is_overdrawn) return <AlertTriangle className="w-5 h-5 text-red-500" />
    if (client.balance_hours < 5) return <Clock className="w-5 h-5 text-yellow-500" />
    return <CheckCircle className="w-5 h-5 text-green-500" />
  }

  if (loading) {
    return <LoadingSpinner message="Loading credit balances..." size="lg" />
  }

  const totalBalance = clients.reduce((sum, client) => sum + client.balance_hours, 0)
  const overdrawnClients = clients.filter(client => client.is_overdrawn).length

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Client Credits"
        subtitle="Simplified credit-based retainer tracking"
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button onClick={loadCreditsSummary} className="mt-2" variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Clients</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{clients.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Balance</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatHours(totalBalance)}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Overdrawn</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{overdrawnClients}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Client Credits Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Client Credit Balances</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Real-time credit tracking for all retainer clients
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Last Updated
                </th>
                {(currentUser?.role === 'SLT' || currentUser?.role === 'manager') && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              {clients.map((client) => (
                <tr key={client.client_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {client.client_name}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      ID: {client.client_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getStatusColor(client)}`}>
                      {formatHours(client.balance_hours)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(client)}
                      <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
                        {client.is_overdrawn ? 'Overdrawn' : client.balance_hours < 5 ? 'Low' : 'Good'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                    {client.total_transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                    {client.last_updated ? new Date(client.last_updated).toLocaleDateString() : 'Never'}
                  </td>
                  {(currentUser?.role === 'SLT' || currentUser?.role === 'manager') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => {
                          setSelectedClient(client)
                          setShowAddCreditsModal(true)
                        }}
                        size="sm"
                        variant="outline"
                        className="mr-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Credits
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Credits Modal */}
      {showAddCreditsModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
              Add Credits to {selectedClient.client_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Hours to Add
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={addCreditsForm.hours}
                  onChange={(e) => setAddCreditsForm({ ...addCreditsForm, hours: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                  placeholder="Enter hours (e.g., 10.5)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  value={addCreditsForm.description}
                  onChange={(e) => setAddCreditsForm({ ...addCreditsForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                  rows={3}
                  placeholder="Reason for adding credits..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowAddCreditsModal(false)
                  setAddCreditsForm({ hours: '', description: '' })
                  setSelectedClient(null)
                }}
                variant="outline"
                disabled={addingCredits}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCredits}
                disabled={!addCreditsForm.hours || !addCreditsForm.description || addingCredits}
              >
                {addingCredits ? 'Adding...' : 'Add Credits'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}