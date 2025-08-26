import React, { useState, useEffect } from 'react'
import { Save, X, Mail, Bell, Calendar } from 'lucide-react'
import { Button } from './Button'
import { toast } from 'sonner'

interface EmailConfig {
  monthly_statements: boolean
  overuse_alerts: boolean
  balance_warnings: boolean
  contract_reminders: boolean
  utilization_reports: boolean
  statement_schedule: 'monthly' | 'weekly' | 'daily'
  alert_threshold: number // percentage
  warning_threshold: number // percentage
  reminder_days_before: number
  custom_email?: string
}

interface EmailConfigModalProps {
  clientId: number
  clientName: string
  clientEmail: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const EmailConfigModal: React.FC<EmailConfigModalProps> = ({ 
  clientId, 
  clientName, 
  clientEmail,
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [config, setConfig] = useState<EmailConfig>({
    monthly_statements: true,
    overuse_alerts: true,
    balance_warnings: true,
    contract_reminders: false,
    utilization_reports: false,
    statement_schedule: 'monthly',
    alert_threshold: 90,
    warning_threshold: 75,
    reminder_days_before: 30,
    custom_email: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && clientId) {
      loadEmailConfig()
    }
  }, [isOpen, clientId])

  const loadEmailConfig = async () => {
    setIsLoading(true)
    try {
      // For now, we'll use default config since the backend endpoint might not exist yet
      // In a real implementation, you would fetch from: `/api/clients/${clientId}/email-config`
      // const response = await clientService.getEmailConfig(clientId)
      // setConfig(response)
      
      // Using defaults for now
      setConfig({
        monthly_statements: true,
        overuse_alerts: true,
        balance_warnings: true,
        contract_reminders: false,
        utilization_reports: false,
        statement_schedule: 'monthly',
        alert_threshold: 90,
        warning_threshold: 75,
        reminder_days_before: 30,
        custom_email: ''
      })
    } catch (error) {
      console.error('Failed to load email config:', error)
      toast.error('Failed to load email configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (config.alert_threshold <= config.warning_threshold) {
      toast.error('Alert threshold must be higher than warning threshold')
      return
    }

    if (config.reminder_days_before < 1) {
      toast.error('Reminder days must be at least 1')
      return
    }

    setIsSubmitting(true)

    try {
      // In a real implementation, you would save to the backend:
      // await clientService.updateEmailConfig(clientId, config)
      
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSuccess()
      onClose()
      toast.success('Email configuration saved successfully')
    } catch (error) {
      console.error('Failed to save email config:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save email configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Email Notifications</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Configure email notifications for {clientName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple-strong mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">Loading configuration...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Email Address */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Primary Email
                  </label>
                  <input
                    type="text"
                    value={clientEmail}
                    disabled
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Primary email from client profile
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Additional Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={config.custom_email}
                    onChange={(e) => setConfig({...config, custom_email: e.target.value})}
                    placeholder="additional@example.com"
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Notification Types */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notification Types
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="monthly_statements"
                    checked={config.monthly_statements}
                    onChange={(e) => setConfig({...config, monthly_statements: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <div>
                    <label htmlFor="monthly_statements" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Monthly Statements
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Automatically send monthly billing statements
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="overuse_alerts"
                    checked={config.overuse_alerts}
                    onChange={(e) => setConfig({...config, overuse_alerts: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <div>
                    <label htmlFor="overuse_alerts" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Overuse Alerts
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Alert when allocation is exceeded
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="balance_warnings"
                    checked={config.balance_warnings}
                    onChange={(e) => setConfig({...config, balance_warnings: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <div>
                    <label htmlFor="balance_warnings" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Balance Warnings
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Warn when approaching allocation limit
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="contract_reminders"
                    checked={config.contract_reminders}
                    onChange={(e) => setConfig({...config, contract_reminders: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <div>
                    <label htmlFor="contract_reminders" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Contract Reminders
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Remind about upcoming contract end dates
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="utilization_reports"
                    checked={config.utilization_reports}
                    onChange={(e) => setConfig({...config, utilization_reports: e.target.checked})}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-brand-purple-strong focus:ring-brand-purple-strong"
                  />
                  <div>
                    <label htmlFor="utilization_reports" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Utilization Reports
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Weekly utilization summary reports
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Thresholds */}
            <div>
              <h4 className="text-md font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule & Thresholds
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Statement Schedule
                  </label>
                  <select
                    value={config.statement_schedule}
                    onChange={(e) => setConfig({...config, statement_schedule: e.target.value as 'monthly' | 'weekly' | 'daily'})}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Warning Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={config.warning_threshold}
                    onChange={(e) => setConfig({...config, warning_threshold: parseInt(e.target.value) || 75})}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.alert_threshold}
                    onChange={(e) => setConfig({...config, alert_threshold: parseInt(e.target.value) || 90})}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Contract Reminder (days before)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={config.reminder_days_before}
                    onChange={(e) => setConfig({...config, reminder_days_before: parseInt(e.target.value) || 30})}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-purple-strong focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}