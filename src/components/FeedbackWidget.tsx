import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useBackendAuth } from '../contexts/ReduxAuthProvider'
import { apiService } from '../services/apiService'
import '../styles/FeedbackWidget.css'

interface FeedbackData {
  feedback_type: 'bug' | 'feature_request'
  message: string
  page_url?: string
}

const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature_request'>('feature_request')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const location = useLocation()
  const { user } = useBackendAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const feedbackData: FeedbackData = {
        feedback_type: feedbackType,
        message: message.trim(),
        page_url: window.location.href
      }


      const response = await apiService.post('/api/feedback/', feedbackData)

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.status} ${response.statusText}`)
      }

      setSubmitStatus('success')
      setMessage('')

      // Close widget after 2 seconds on success
      setTimeout(() => {
        setIsOpen(false)
        setSubmitStatus('idle')
      }, 2000)
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setMessage('')
    setSubmitStatus('idle')
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null
  }

  return (
    <>
      {/* Floating button */}
      <button
        className="feedback-widget-trigger"
        onClick={() => { setIsOpen(true); }}
        aria-label="Send feedback"
        title="Report a bug or request a feature"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"
            fill="currentColor"
          />
          <path
            d="M11 14H13V12H11V14ZM11 10H13V6H11V10Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Feedback modal */}
      {isOpen && (
        <div className="feedback-widget-overlay" onClick={handleClose}>
          <div
            className="feedback-widget-modal"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="feedback-widget-header">
              <h3>Send Feedback</h3>
              <button
                className="feedback-widget-close"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="feedback-widget-form">
              <div className="feedback-widget-type">
                <label>
                  <input
                    type="radio"
                    value="bug"
                    checked={feedbackType === 'bug'}
                    onChange={(e) => { setFeedbackType(e.target.value as 'bug'); }}
                  />
                  <span>🐛 Report a Bug</span>
                </label>
                <label>
                  <input
                    type="radio"
                    value="feature_request"
                    checked={feedbackType === 'feature_request'}
                    onChange={(e) => { setFeedbackType(e.target.value as 'feature_request'); }}
                  />
                  <span>✨ Request a Feature</span>
                </label>
              </div>

              <div className="feedback-widget-field">
                <label htmlFor="feedback-message">
                  {feedbackType === 'bug' ? 'Describe the issue:' : 'Describe your feature request:'}
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); }}
                  placeholder={
                    feedbackType === 'bug'
                      ? 'Please describe what went wrong, what you expected to happen, and steps to reproduce if possible...'
                      : 'Please describe the feature you would like to see added and how it would help you...'
                  }
                  rows={5}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="feedback-widget-info">
                <small>
                  Submitting from: <strong>{location.pathname}</strong>
                </small>
                <small>
                  User: <strong>{user.email}</strong>
                </small>
              </div>

              {submitStatus === 'success' && (
                <div className="feedback-widget-success">
                  ✅ Thank you! Your feedback has been submitted.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="feedback-widget-error">
                  ❌ Failed to submit feedback. Please try again.
                </div>
              )}

              <div className="feedback-widget-actions">
                <button
                  type="button"
                  onClick={handleClose}
                  className="feedback-widget-cancel"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="feedback-widget-submit"
                  disabled={isSubmitting || !message.trim()}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackWidget
