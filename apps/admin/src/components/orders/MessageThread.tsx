'use client'

import type { Message } from '@madebuy/shared'
import { MessageSquare, Send, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface MessageThreadProps {
  orderId: string
  initialMessages?: Message[]
  onNewMessage?: () => void
}

export function MessageThread({
  orderId,
  initialMessages = [],
  onNewMessage,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(!initialMessages.length)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/messages`)
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      const data = await response.json()
      setMessages(data.messages || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  // Initial fetch
  useEffect(() => {
    if (!initialMessages.length) {
      fetchMessages()
    }
  }, [fetchMessages, initialMessages.length])

  // Poll for new messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [newMessage])

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
      onNewMessage?.()
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">
              Start a conversation with your customer
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[40px] max-h-[150px]"
            rows={1}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your customer will receive an email notification when you send a
          message.
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isSeller = message.senderType === 'seller'
  const formattedDate = new Date(message.createdAt).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isSeller ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Sender info */}
        <div
          className={`flex items-center gap-2 mb-1 text-xs ${
            isSeller ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          <User className="h-3 w-3" />
          <span className="font-medium">{message.senderName}</span>
          <span>-</span>
          <span>{formattedDate}</span>
        </div>

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment, idx) => (
              <a
                key={idx}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-xs underline ${
                  isSeller ? 'text-blue-100' : 'text-blue-600'
                }`}
              >
                {attachment.name}
              </a>
            ))}
          </div>
        )}

        {/* Read status for customer messages */}
        {!isSeller && message.isRead && (
          <p className="text-xs text-gray-400 mt-1">Read</p>
        )}
      </div>
    </div>
  )
}
