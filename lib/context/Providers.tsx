'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from './ThemeContext'
import { RoleProvider } from './RoleContext'
import { ActivityLogProvider } from './ActivityLogContext'
import { AddContactProvider } from './AddContactContext'
import { NotificationProvider } from './NotificationContext'
import { SearchProvider } from './SearchContext'
import { ContractProvider } from './ContractContext'
import { InviteAgentProvider } from './InviteAgentContext'
import { TeamBroadcastProvider } from './TeamBroadcastContext'
import { FeedbackProvider } from './FeedbackContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {/* Every framer-motion animation honours the OS "reduce motion" setting. */}
      <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <RoleProvider>
          <ActivityLogProvider>
            <AddContactProvider>
              <ContractProvider>
                <InviteAgentProvider>
                  <TeamBroadcastProvider>
                    <NotificationProvider>
                      <SearchProvider>
                        <FeedbackProvider>
                          {children}
                        </FeedbackProvider>
                      </SearchProvider>
                    </NotificationProvider>
                  </TeamBroadcastProvider>
                </InviteAgentProvider>
              </ContractProvider>
            </AddContactProvider>
          </ActivityLogProvider>
        </RoleProvider>
      </ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
