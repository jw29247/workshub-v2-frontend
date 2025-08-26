import React, { useState, useEffect } from 'react'
import { websocketService } from '../services/websocketService'
import { WifiOff, Wifi } from 'lucide-react'

export const WebSocketStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(websocketService.isSocketConnected())
  const [showStatus, setShowStatus] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true)
      setConnectionError(null)
      // Show success briefly when reconnecting
      if (!isConnected) {
        setShowStatus(true)
        setTimeout(() => { setShowStatus(false); }, 3000)
      }
    }

    const handleDisconnected = (data: unknown) => {
      const reason = (data as { reason?: string })?.reason || 'Unknown reason'
      setIsConnected(false)
      setShowStatus(true)
      setConnectionError(`Connection lost: ${reason}`)
    }

    const handleConnectionError = (data: unknown) => {
      const error = (data as { error?: string })?.error || 'Connection error'
      setIsConnected(false)
      setShowStatus(true)
      setConnectionError(error)
    }

    // Subscribe to WebSocket events
    websocketService.on('connected', handleConnected)
    websocketService.on('disconnected', handleDisconnected)
    websocketService.on('connection_error', handleConnectionError)

    // Check initial connection state
    setIsConnected(websocketService.isSocketConnected())

    return () => {
      // Cleanup event listeners
      websocketService.off('connected', handleConnected)
      websocketService.off('disconnected', handleDisconnected)
      websocketService.off('connection_error', handleConnectionError)
    }
  }, [isConnected])

  // Only show status when disconnected or briefly after reconnecting
  if (!showStatus && isConnected) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        showStatus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
          isConnected
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}
        role="status"
        aria-live="polite"
      >
        {isConnected ? (
          <>
            <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Connected to live updates
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Real-time updates unavailable
              </p>
              {connectionError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {connectionError}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
