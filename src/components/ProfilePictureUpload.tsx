import React, { useState, useRef } from 'react'
import { Camera, X, User } from 'lucide-react'

interface ProfilePictureUploadProps {
  currentImageUrl?: string
  onFileSelect: (file: File | null) => void
  onError: (error: string) => void
  disabled?: boolean
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  onFileSelect,
  onError,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError('File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Store file for later upload and notify parent
    onFileSelect(file)
  }

  const clearSelection = () => {
    setPreviewUrl(null)
    onFileSelect(null) // Clear selection in parent
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const displayImageUrl = previewUrl || currentImageUrl

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-purple-strong/10 flex items-center justify-center overflow-hidden">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt="Profile"
              className="w-16 h-16 object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-brand-purple-strong" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-neutral-900 dark:text-white">Profile Picture</h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            JPG, PNG or GIF. Max size 5MB.
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-brand-purple-strong bg-brand-purple-strong/5'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-brand-purple-strong/50'
        } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="space-y-2">
          <Camera className="h-8 w-8 mx-auto text-neutral-400" />
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              <span className="font-medium text-brand-purple-strong">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              JPG, PNG or GIF (max. 5MB)
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="relative">
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-10 h-10 object-cover rounded"
              />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  New profile picture
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Will be uploaded when you save changes
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearSelection()
              }}
              disabled={disabled}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
