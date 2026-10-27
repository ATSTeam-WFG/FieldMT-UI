'use client'

import { Moon } from 'lucide-react'

interface ScoreRingProps {
  /** null = Dormant: no activity in the last 180 days, so no score at all. */
  score: number | null
  size?: number
  strokeWidth?: number
  /** Small rings: the number alone (no "/ 100"), and a moon icon for Dormant instead of the word. */
  compact?: boolean
}

export function ScoreRing({ score, size = 120, strokeWidth = 10, compact = false }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const fillFraction = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100
  const dashOffset = circumference * (1 - fillFraction)
  const center = size / 2

  const ring = <>
    {/* Background ring */}
    <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke="var(--border)"
      strokeWidth={strokeWidth}
    />
    {/* Foreground arc — starts at 12 o'clock via rotation */}
    {score !== null && <circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke="#c4a574"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={dashOffset}
      transform={`rotate(-90 ${center} ${center})`}
      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
    />}
  </>

  if (compact) {
    return (
      <div
        title={score === null ? 'Dormant — no activity in the last 180 days' : `Score ${score} of 100`}
        style={{ position: 'relative', width: size, height: size }}
      >
        <svg width={size} height={size} style={{ display: 'block' }}>{ring}</svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {score === null
            ? <Moon size={Math.round(size * 0.34)} color="var(--muted)" strokeWidth={1.75} aria-label="Dormant" />
            : <span style={{ fontSize: Math.round(size * 0.34), fontWeight: 700, color: 'var(--foreground)' }}>{score}</span>}
        </div>
      </div>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      style={{ display: 'block' }}
    >
      {ring}
      {score === null ? (
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--muted)"
          fontSize={14}
          fontWeight={600}
          fontFamily="Inter, sans-serif"
        >
          Dormant
        </text>
      ) : <>
      {/* Score number */}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--foreground)"
        fontSize={20}
        fontWeight={700}
        fontFamily="Inter, sans-serif"
      >
        {score}
      </text>
      {/* "/ 100" label */}
      <text
        x={center}
        y={center + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--muted)"
        fontSize={11}
        fontFamily="Inter, sans-serif"
      >
        / 100
      </text>
      </>}
    </svg>
  )
}
