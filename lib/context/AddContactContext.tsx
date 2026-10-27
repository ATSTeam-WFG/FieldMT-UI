'use client'

import { createContext, useContext, useRef, useState } from 'react'
import type { Contact } from '@/lib/api/contacts'

export interface ContactRecord {
  id: string
  name: string
  initials: string
  company: string
  role: string
  type: string
  email: string
  phone: string
  tags: string[]
  [key: string]: unknown
}

interface AddContactContextValue {
  isOpen: boolean
  editingContact: ContactRecord | null
  isStacked: boolean
  openAddContact: () => void
  openAddContactWithCallback: (cb: (contact: Contact) => void) => void
  openEditContact: (contact: ContactRecord) => void
  closeAddContact: () => void
  fireContactCreated: (contact: Contact) => void
}

const AddContactContext = createContext<AddContactContextValue>({
  isOpen: false,
  editingContact: null,
  isStacked: false,
  openAddContact: () => {},
  openAddContactWithCallback: () => {},
  openEditContact: () => {},
  closeAddContact: () => {},
  fireContactCreated: () => {},
})

export function AddContactProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null)
  const [isStacked, setIsStacked] = useState(false)
  const onContactCreatedRef = useRef<((contact: Contact) => void) | null>(null)

  return (
    <AddContactContext.Provider
      value={{
        isOpen,
        editingContact,
        isStacked,
        openAddContact: () => {
          setEditingContact(null)
          setIsStacked(false)
          setIsOpen(true)
        },
        openAddContactWithCallback: (cb) => {
          onContactCreatedRef.current = cb
          setIsStacked(true)
          setEditingContact(null)
          setIsOpen(true)
        },
        openEditContact: (contact) => {
          setEditingContact(contact)
          setIsStacked(false)
          setIsOpen(true)
        },
        closeAddContact: () => {
          setIsOpen(false)
          setEditingContact(null)
          setIsStacked(false)
          onContactCreatedRef.current = null
        },
        fireContactCreated: (contact) => {
          const cb = onContactCreatedRef.current
          onContactCreatedRef.current = null
          cb?.(contact)
        },
      }}
    >
      {children}
    </AddContactContext.Provider>
  )
}

export const useAddContact = () => useContext(AddContactContext)
