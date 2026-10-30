'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

// The access flow keeps its lockup fixed between pages, so it opts out of the route
// fade-and-rise; its cards animate themselves (components/app/AccessShell.tsx).
const ACCESS_ROUTES = ['/activate', '/accept', '/join', '/signup', '/no-access', '/welcome']

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (ACCESS_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
