"use client"

import * as React from "react"
import { FileText, Download, Calendar } from "lucide-react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface Document {
  id: string
  title: string
  fileUrl: string
  uploadedAt: string
}

interface DocumentsTabProps {
  documents: Document[]
}

function formatDate(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function DocumentsTab({ documents }: DocumentsTabProps) {
  return (
    <Card>
      <CardContent className="pt-(--card-spacing)">
        {documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No documents available.</p>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="mr-1 inline size-3" />
                      {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
