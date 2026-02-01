'use client'

import type { Milestone } from '@madebuy/shared'
import { useEffect, useState } from 'react'

interface CelebrationModalProps {
  milestone: Milestone
  onDismiss: () => void
}

export function CelebrationModal({
  milestone,
  onDismiss,
}: CelebrationModalProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Trigger animation shortly after mount
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    setTimeout(onDismiss, 300) // Wait for fade-out animation
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform transition-all duration-300 ${
            show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* Confetti Animation */}
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: [
                    '#ff6b6b',
                    '#4ecdc4',
                    '#45b7d1',
                    '#f9ca24',
                    '#6c5ce7',
                    '#fd79a8',
                  ][Math.floor(Math.random() * 6)],
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="text-6xl mb-4 animate-bounce">{milestone.icon}</div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {milestone.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6">{milestone.description}</p>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: -10px;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
          z-index: 51;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          opacity: 0;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            top: -10px;
            opacity: 1;
            transform: translateX(0) rotateZ(0deg);
          }
          100% {
            top: 100vh;
            opacity: 0;
            transform: translateX(${Math.random() * 100 - 50}px)
              rotateZ(${Math.random() * 360}deg);
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out 3;
        }
      `}</style>
    </>
  )
}
