"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportFunding } from "@/lib/excel-export"

interface DownloadButtonProps {
  data: any[]
  fileName?: string
}

export function FundingDownloadButton({ data, fileName }: DownloadButtonProps) {
  const handleDownload = () => {
    exportFunding(data, fileName)
  }

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Download Excel
    </Button>
  )
}
