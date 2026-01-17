'use client'

import type { DigitalFile, DigitalProductConfig } from '@madebuy/shared'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Edit2,
  FileText,
  GripVertical,
  Mail,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { FileUploader } from './FileUploader'

interface DigitalProductEditorProps {
  pieceId: string
  digital?: DigitalProductConfig
  onUpdate: (digital: DigitalProductConfig) => void
}

// License type labels
const _LICENSE_LABELS = {
  personal: 'Personal Use',
  commercial: 'Commercial Use',
  extended: 'Extended License',
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

// Get icon for file type
function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.includes('pdf')) return '📄'
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  )
    return '📦'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return '📊'
  if (mimeType.includes('font')) return '🔤'
  return '📁'
}

export function DigitalProductEditor({
  pieceId,
  digital,
  onUpdate,
}: DigitalProductEditorProps) {
  const [isEnabled, setIsEnabled] = useState(digital?.isDigital ?? false)
  const [files, setFiles] = useState<DigitalFile[]>(digital?.files ?? [])
  const [settings, setSettings] = useState({
    downloadLimit: digital?.downloadLimit ?? null,
    downloadExpiryDays: digital?.downloadExpiryDays ?? null,
    instantDelivery: digital?.instantDelivery ?? true,
    emailDelivery: digital?.emailDelivery ?? true,
    licenseType: digital?.licenseType ?? null,
    licenseText: digital?.licenseText ?? '',
  })

  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingVersion, setEditingVersion] = useState('')

  const [saving, setSaving] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Save settings to API
  const saveSettings = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/pieces/${pieceId}/digital`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDigital: isEnabled,
          ...settings,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      const data = await response.json()
      setSuccess('Settings saved')
      setTimeout(() => setSuccess(null), 2000)

      // Update parent
      onUpdate(data.digital)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [pieceId, isEnabled, settings, onUpdate])

  // Handle file upload complete
  const handleUploadComplete = useCallback(
    (newFile: DigitalFile) => {
      setFiles((prev) => [...prev, newFile])
      setUploadOpen(false)

      // Update parent with new file list
      const updatedDigital: DigitalProductConfig = {
        isDigital: true,
        files: [...files, newFile],
        downloadLimit: settings.downloadLimit ?? undefined,
        downloadExpiryDays: settings.downloadExpiryDays ?? undefined,
        instantDelivery: settings.instantDelivery,
        emailDelivery: settings.emailDelivery,
        licenseType: settings.licenseType ?? undefined,
        licenseText: settings.licenseText || undefined,
      }
      onUpdate(updatedDigital)

      // If this is first file, enable digital
      if (!isEnabled) {
        setIsEnabled(true)
      }
    },
    [files, settings, isEnabled, onUpdate],
  )

  // Delete a file
  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!confirm('Delete this file? This cannot be undone.')) return

      try {
        const response = await fetch(`/api/pieces/${pieceId}/files/${fileId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete file')
        }

        const updatedFiles = files.filter((f) => f.id !== fileId)
        setFiles(updatedFiles)

        // Update parent
        const updatedDigital: DigitalProductConfig = {
          isDigital: updatedFiles.length > 0,
          files: updatedFiles,
          downloadLimit: settings.downloadLimit ?? undefined,
          downloadExpiryDays: settings.downloadExpiryDays ?? undefined,
          instantDelivery: settings.instantDelivery,
          emailDelivery: settings.emailDelivery,
          licenseType: settings.licenseType ?? undefined,
          licenseText: settings.licenseText || undefined,
        }
        onUpdate(updatedDigital)

        if (updatedFiles.length === 0) {
          setIsEnabled(false)
        }

        setSuccess('File deleted')
        setTimeout(() => setSuccess(null), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete')
      }
    },
    [pieceId, files, settings, onUpdate],
  )

  // Start editing a file
  const startEditing = (file: DigitalFile) => {
    setEditingFile(file.id)
    setEditingName(file.name)
    setEditingDescription(file.description || '')
    setEditingVersion(file.version || '')
  }

  // Save file edits
  const saveFileEdit = async (fileId: string) => {
    try {
      const response = await fetch(`/api/pieces/${pieceId}/files/${fileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingName,
          description: editingDescription || undefined,
          version: editingVersion || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update file')
      }

      const data = await response.json()

      // Update local state
      setFiles((prev) => prev.map((f) => (f.id === fileId ? data.file : f)))
      setEditingFile(null)

      // Update parent
      const updatedFiles = files.map((f) => (f.id === fileId ? data.file : f))
      const updatedDigital: DigitalProductConfig = {
        isDigital: true,
        files: updatedFiles,
        downloadLimit: settings.downloadLimit ?? undefined,
        downloadExpiryDays: settings.downloadExpiryDays ?? undefined,
        instantDelivery: settings.instantDelivery,
        emailDelivery: settings.emailDelivery,
        licenseType: settings.licenseType ?? undefined,
        licenseText: settings.licenseText || undefined,
      }
      onUpdate(updatedDigital)

      setSuccess('File updated')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  // Toggle digital product mode
  const toggleDigital = async () => {
    const newEnabled = !isEnabled
    setIsEnabled(newEnabled)

    try {
      const response = await fetch(`/api/pieces/${pieceId}/digital`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDigital: newEnabled }),
      })

      if (!response.ok) {
        setIsEnabled(!newEnabled)
        throw new Error('Failed to update')
      }

      const data = await response.json()
      onUpdate(data.digital)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  return (
    <div className="rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Download className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Digital Product
            </h2>
            <p className="text-sm text-gray-600">
              Sell downloadable files like PDFs, music, videos, or software
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={toggleDigital}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      {isEnabled && (
        <div className="p-6 space-y-6">
          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Files Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Downloadable Files</h3>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                Add File
              </button>
            </div>

            {files.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  No files yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Upload files that customers can download after purchase
                </p>
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  <Plus className="h-4 w-4" />
                  Upload First File
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {files
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />

                      <span className="text-xl">
                        {getFileIcon(file.mimeType)}
                      </span>

                      {editingFile === file.id ? (
                        // Edit mode
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder="Display name"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) =>
                              setEditingDescription(e.target.value)
                            }
                            placeholder="Description (optional)"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editingVersion}
                            onChange={(e) => setEditingVersion(e.target.value)}
                            placeholder="Version (e.g., v1.0)"
                            className="w-48 rounded border border-gray-300 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {file.fileName} &bull;{' '}
                            {formatFileSize(file.sizeBytes)}
                            {file.version && ` &bull; ${file.version}`}
                          </p>
                          {file.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {file.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {editingFile === file.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveFileEdit(file.id)}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFile(null)}
                              className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(file)}
                              className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFile(file.id)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                <p className="text-xs text-gray-500 text-center pt-2">
                  Total: {files.length} file{files.length !== 1 ? 's' : ''}{' '}
                  &bull;{' '}
                  {formatFileSize(
                    files.reduce((sum, f) => sum + f.sizeBytes, 0),
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Download Settings</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Download Limit */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Download className="h-4 w-4" />
                  Download Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.downloadLimit ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      downloadLimit: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    }))
                  }
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max downloads per purchase (leave empty for unlimited)
                </p>
              </div>

              {/* Link Expiry */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Clock className="h-4 w-4" />
                  Link Expiry (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.downloadExpiryDays ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      downloadExpiryDays: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    }))
                  }
                  placeholder="Never expires"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Days until download link expires
                </p>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.instantDelivery}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      instantDelivery: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Instant delivery after payment
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.emailDelivery}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      emailDelivery: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Send download link via email
                </span>
              </label>
            </div>
          </div>

          {/* License Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">License</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Type
                </label>
                <select
                  value={settings.licenseType ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      licenseType:
                        (e.target.value as
                          | 'personal'
                          | 'commercial'
                          | 'extended') || null,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="">No license specified</option>
                  <option value="personal">Personal Use Only</option>
                  <option value="commercial">Commercial Use Allowed</option>
                  <option value="extended">Extended License</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom License Terms
                </label>
                <textarea
                  value={settings.licenseText}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      licenseText: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Enter custom license terms (optional)..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-200 pt-4 flex justify-end">
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {uploadOpen && (
        <FileUploader
          pieceId={pieceId}
          onComplete={handleUploadComplete}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  )
}
