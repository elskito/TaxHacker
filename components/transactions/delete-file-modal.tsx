"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteFileModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  fileName?: string
  type?: "file" | "transaction"
}

export function DeleteFileModal({ isOpen, onClose, onConfirm, fileName, type = "file" }: DeleteFileModalProps) {
  const isTransaction = type === "transaction"
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isTransaction ? "Delete Transaction" : "Delete File"}</DialogTitle>
          <DialogDescription>
            {isTransaction 
              ? "Are you sure? This will delete the transaction with all the files permanently"
              : `Are you sure you want to delete ${fileName ? `"${fileName}"` : "this file"}? This action cannot be undone.`
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}