'use client'

import { useState } from 'react'
import { deleteAccount } from '@/app/profile/actions'

export function DeleteAccountButton() {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteAccount()
    } catch (e: any) {
      console.error(e)
      alert('Failed to delete account: ' + e.message)
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-xs text-destructive text-center font-semibold uppercase tracking-wider">
          Permanently delete everything?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 cursor-pointer rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
          <button
            onClick={() => setIsConfirming(false)}
            disabled={isDeleting}
            className="flex-1 cursor-pointer rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      className="w-full cursor-pointer rounded-lg border border-destructive/35 bg-destructive/10 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15"
    >
      Delete account
    </button>
  )
}
