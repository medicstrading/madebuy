'use client'

import type { ImportJob, ImportJobStatus } from '@madebuy/shared'
import { Eye, FileText, History, Loader2, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ImportWizard } from '@/components/import/ImportWizard'

const STATUS_LABELS: Record<ImportJobStatus, { label: string; color: string }> =
  {
    uploaded: { label: 'Uploaded', color: 'bg-gray-100 text-gray-700' },
    validating: { label: 'Validating', color: 'bg-blue-100 text-blue-700' },
    validated: { label: 'Ready', color: 'bg-green-100 text-green-700' },
    processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  }

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null)

  // Load import history
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/import?limit=50')
        if (response.ok) {
          const data = await response.json()
          setJobs(data.jobs)
        }
      } catch (error) {
        console.error('Failed to load import history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  // Delete job
  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this import job?')) return

    try {
      const response = await fetch(`/api/import/${jobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
        if (selectedJob?.id === jobId) {
          setSelectedJob(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete job:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Products</h1>
        <p className="mt-1 text-gray-500">
          Bulk import products from CSV files
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Upload className="h-4 w-4" />
            New Import
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <History className="h-4 w-4" />
            Import History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'new' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <ImportWizard
            onComplete={() => {
              setActiveTab('history')
            }}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No imports yet</p>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Start your first import
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Results
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {jobs.map((job) => {
                    const status = STATUS_LABELS[job.status]
                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {job.filename}
                              </p>
                              <p className="text-sm text-gray-500">
                                {job.rowCount} rows • {job.source}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {job.status === 'completed' && (
                            <span>
                              {job.productsCreated} created,{' '}
                              {job.productsUpdated} updated
                              {job.productsSkipped > 0 &&
                                `, ${job.productsSkipped} skipped`}
                            </span>
                          )}
                          {job.status === 'failed' && job.errors.length > 0 && (
                            <span className="text-red-600">
                              {job.errors.length} error
                              {job.errors.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {['uploaded', 'validated'].includes(job.status) && (
                            <span className="text-gray-400">Pending</span>
                          )}
                          {job.status === 'processing' && (
                            <span className="text-yellow-600">
                              In progress...
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedJob(job)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {job.status !== 'processing' && (
                              <button
                                type="button"
                                onClick={() => handleDelete(job.id)}
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Import Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">File</p>
                  <p className="font-medium">{selectedJob.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="font-medium capitalize">{selectedJob.source}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_LABELS[selectedJob.status].color}`}
                  >
                    {STATUS_LABELS[selectedJob.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rows</p>
                  <p className="font-medium">{selectedJob.rowCount}</p>
                </div>
              </div>

              {selectedJob.status === 'completed' && (
                <div className="grid grid-cols-4 gap-4 rounded-lg bg-gray-50 p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedJob.productsCreated}
                    </p>
                    <p className="text-xs text-gray-500">Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedJob.productsUpdated}
                    </p>
                    <p className="text-xs text-gray-500">Updated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">
                      {selectedJob.productsSkipped}
                    </p>
                    <p className="text-xs text-gray-500">Skipped</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedJob.imagesDownloaded}
                    </p>
                    <p className="text-xs text-gray-500">Images</p>
                  </div>
                </div>
              )}

              {selectedJob.errors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">
                    Errors ({selectedJob.errors.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-4">
                    {selectedJob.errors.map((error, i) => (
                      <div key={i} className="py-1 text-sm text-red-700">
                        <span className="font-mono text-red-500">
                          Row {error.row}:
                        </span>{' '}
                        {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.warnings.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">
                    Warnings ({selectedJob.warnings.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    {selectedJob.warnings.map((warning, i) => (
                      <div key={i} className="py-1 text-sm text-yellow-700">
                        <span className="font-mono text-yellow-600">
                          Row {warning.row}:
                        </span>{' '}
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
