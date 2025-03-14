"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, FileDown, Info, Check, Loader2, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Common domain extensions
const POPULAR_TLDS = [
  { id: "com", label: ".com" },
  { id: "io", label: ".io" },
  { id: "co", label: ".co" },
  { id: "ai", label: ".ai" },
  { id: "so", label: ".so" },
  { id: "dev", label: ".dev" },
]

type FileStatus = "idle" | "uploading" | "processing" | "ready" | "error"
type FilterStatus = "idle" | "applying" | "complete"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<string[][]>([])
  const [originalSize, setOriginalSize] = useState<number>(0)
  const [filteredSize, setFilteredSize] = useState<number>(0)
  const [selectedTLDs, setSelectedTLDs] = useState<string[]>([])
  const [filteredData, setFilteredData] = useState<string[][]>([])
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("idle")
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [filterProgress, setFilterProgress] = useState<number>(0)
  const [hasNameColumn, setHasNameColumn] = useState<boolean>(false)
  const [nameColumnIndex, setNameColumnIndex] = useState<number>(-1)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [downloadReady, setDownloadReady] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Simulate upload progress
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (fileStatus === "uploading") {
      let progress = 0
      interval = setInterval(() => {
        progress += Math.random() * 15
        if (progress > 95) {
          clearInterval(interval)
          setUploadProgress(95)
        } else {
          setUploadProgress(progress)
        }
      }, 200)
    } else if (fileStatus === "processing") {
      setUploadProgress(100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [fileStatus])

  // Simulate filter progress
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (filterStatus === "applying") {
      let progress = 0
      interval = setInterval(() => {
        progress += Math.random() * 20
        if (progress > 95) {
          clearInterval(interval)
          setFilterProgress(95)
        } else {
          setFilterProgress(progress)
        }
      }, 100)
    } else if (filterStatus === "complete") {
      setFilterProgress(100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [filterStatus])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFileStatus("uploading")
    setFile(selectedFile)
    setUploadProgress(0)

    // Simulate network delay for larger files to show the progress animation
    setTimeout(
      () => {
        const reader = new FileReader()

        reader.onload = (event) => {
          try {
            setFileStatus("processing")

            const text = event.target?.result as string
            const rows = parseCSV(text)

            if (rows.length === 0) {
              throw new Error("CSV file appears to be empty")
            }

            // Find the "name" column
            const headers = rows[0]
            const nameIndex = headers.findIndex(
              (header) => header.toLowerCase().trim() === "name" || header.toLowerCase().trim() === "domain",
            )

            if (nameIndex === -1) {
              setHasNameColumn(false)
              setFileStatus("error")
              toast({
                title: "Column Not Found",
                description: "No 'name' column found in the CSV. Please ensure your file has a column named 'name'.",
                variant: "destructive",
              })
            } else {
              setHasNameColumn(true)
              setNameColumnIndex(nameIndex)
              setCsvData(rows)
              setOriginalSize(new Blob([text]).size)
              setFilteredSize(new Blob([text]).size)
              setFilteredData(rows)
              setFileStatus("ready")

              toast({
                title: "File Uploaded Successfully",
                description: `${rows.length - 1} rows loaded from ${selectedFile.name}`,
                variant: "default",
              })
            }
          } catch (error) {
            console.error("Error parsing CSV:", error)
            setFileStatus("error")
            toast({
              title: "Error",
              description: "Failed to parse the CSV file. Please check the format.",
              variant: "destructive",
            })
          }
        }

        reader.onerror = () => {
          setFileStatus("error")
          toast({
            title: "Error",
            description: "Failed to read the file.",
            variant: "destructive",
          })
        }

        reader.readAsText(selectedFile)
      },
      selectedFile.size > 50000 ? 1500 : 500,
    ) // Longer delay for larger files
  }

  const parseCSV = (text: string): string[][] => {
    // Simple CSV parser that handles quoted fields
    const rows: string[][] = []
    const lines = text.split(/\r?\n/)

    for (const line of lines) {
      if (line.trim() === "") continue

      const row: string[] = []
      let inQuotes = false
      let currentField = ""

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          row.push(currentField)
          currentField = ""
        } else {
          currentField += char
        }
      }

      row.push(currentField)
      rows.push(row)
    }

    return rows
  }

  const handleExtensionToggle = (extension: string) => {
    setSelectedTLDs((prev) => {
      if (prev.includes(extension)) {
        return prev.filter((ext) => ext !== extension)
      } else {
        return [...prev, extension]
      }
    })

    // Reset download ready state when filters change
    setDownloadReady(false)
  }

  const applyFilter = () => {
    if (!hasNameColumn || nameColumnIndex === -1 || csvData.length === 0) {
      toast({
        title: "Error",
        description: "Cannot apply filter. Please upload a valid CSV with a 'name' column.",
        variant: "destructive",
      })
      return
    }

    if (selectedTLDs.length === 0) {
      toast({
        title: "No TLDs Selected",
        description: "Please select at least one TLD to include in the results.",
        variant: "destructive",
      })
      return
    }

    setFilterStatus("applying")
    setFilterProgress(0)
    setDownloadReady(false)

    // Use setTimeout to allow the UI to update and show the loading state
    setTimeout(() => {
      try {
        // Keep the header row and filter the data rows
        const headers = csvData[0]
        const filteredRows = [headers]

        for (let i = 1; i < csvData.length; i++) {
          const row = csvData[i]
          if (row.length <= nameColumnIndex) continue

          const domain = row[nameColumnIndex].trim().toLowerCase()
          const shouldKeep = selectedTLDs.some((ext) => domain.endsWith(`.${ext}`))

          if (shouldKeep) {
            filteredRows.push(row)
          }
        }

        setFilteredData(filteredRows)

        // Calculate new file size
        const csvString = filteredRows.map((row) => row.join(",")).join("\n")
        const newSize = new Blob([csvString]).size
        setFilteredSize(newSize)

        setFilterStatus("complete")
        setDownloadReady(true)

        const keptCount = filteredRows.length - 1 // Subtract header row
        toast({
          title: "Filtering Complete",
          description: `Kept ${keptCount} rows with selected domain extensions.`,
          variant: "default",
        })
      } catch (error) {
        console.error("Error applying filter:", error)
        setFilterStatus("idle")
        toast({
          title: "Error",
          description: "Failed to apply filters. Please try again.",
          variant: "destructive",
        })
      }
    }, 800) // Slight delay to show the animation
  }

  const downloadFilteredCSV = () => {
    if (filteredData.length === 0 || !downloadReady) return

    try {
      const csvString = filteredData.map((row) => row.join(",")).join("\n")
      const blob = new Blob([csvString], { type: "text/csv" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = file ? `filtered_${file.name}` : "filtered_data.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Download Started",
        description: "Your filtered CSV file is being downloaded.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download the filtered CSV. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv")) {
        if (fileInputRef.current) {
          // Create a DataTransfer object and add the file
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(droppedFile)
          fileInputRef.current.files = dataTransfer.files

          // Trigger the change event manually
          const event = new Event("change", { bubbles: true })
          fileInputRef.current.dispatchEvent(event)
        }
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file.",
          variant: "destructive",
        })
      }
    }
  }

  const resetFile = () => {
    setFile(null)
    setCsvData([])
    setFilteredData([])
    setOriginalSize(0)
    setFilteredSize(0)
    setFileStatus("idle")
    setFilterStatus("idle")
    setUploadProgress(0)
    setFilterProgress(0)
    setHasNameColumn(false)
    setNameColumnIndex(-1)
    setDownloadReady(false)

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const calculateSizeReduction = (): string => {
    if (originalSize === 0 || filteredSize === 0) return "0%"

    const reduction = ((originalSize - filteredSize) / originalSize) * 100
    return `${reduction.toFixed(1)}%`
  }

  const getFileStatusIcon = () => {
    switch (fileStatus) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />
      case "ready":
        return <Check className="h-5 w-5 text-green-500" />
      case "error":
        return <X className="h-5 w-5 text-destructive" />
      default:
        return null
    }
  }

  const getFileStatusText = () => {
    switch (fileStatus) {
      case "uploading":
        return "Uploading..."
      case "processing":
        return "Processing..."
      case "ready":
        return "Ready"
      case "error":
        return "Error"
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold text-center">Domain Filter Tool</h1>
          <p className="text-center text-muted-foreground mt-2">
            Upload a CSV file, select domain extensions to keep, and download the results
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          {/* Left Column - File Upload and Results */}
          <div className="space-y-6">
            {/* File Upload Section */}
            <Card className="p-6 overflow-hidden">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300",
                  isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "hover:bg-muted/50",
                  fileStatus === "uploading" || fileStatus === "processing" ? "opacity-70 pointer-events-none" : "",
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={fileStatus === "uploading" || fileStatus === "processing"}
                />
                <div className={cn("transition-transform duration-300", isDragging ? "scale-110" : "")}>
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground mb-4">Drag and drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">
                    File must include a column named &apos;name&apos; containing domains
                  </p>
                </div>
              </div>

              {(fileStatus === "uploading" || fileStatus === "processing") && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {fileStatus === "uploading" ? "Uploading..." : "Processing..."}
                    </span>
                    <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {file && fileStatus !== "idle" && (
                <div
                  className={cn(
                    "mt-4 p-4 rounded-lg transition-all duration-300",
                    fileStatus === "ready"
                      ? "bg-green-50 dark:bg-green-950/20"
                      : fileStatus === "error"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : "bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3">{getFileStatusIcon()}</div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium">{file.name}</p>
                          <span
                            className={cn(
                              "ml-2 text-xs px-2 py-0.5 rounded-full",
                              fileStatus === "ready"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : fileStatus === "error"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                  : "bg-muted-foreground/20 text-muted-foreground",
                            )}
                          >
                            {getFileStatusText()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {!hasNameColumn && fileStatus === "error" && (
                        <div className="flex items-center text-destructive text-sm mr-3">
                          <Info className="h-4 w-4 mr-1" />
                          No &apos;name&apos; column
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          resetFile()
                        }}
                        disabled={fileStatus === "uploading" || fileStatus === "processing"}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Results Section */}
            {csvData.length > 0 && fileStatus === "ready" && (
              <Card
                className={cn(
                  "p-6 transition-all duration-300",
                  filterStatus === "complete" ? "ring-1 ring-green-200 dark:ring-green-800" : "",
                )}
              >
                <h3 className="text-lg font-medium mb-4">Results</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Original Size</p>
                    <p className="text-lg font-medium">{formatFileSize(originalSize)}</p>
                  </div>
                  <div
                    className={cn(
                      "p-4 rounded-lg transition-all duration-300",
                      filterStatus === "complete" && filteredSize < originalSize
                        ? "bg-green-50 dark:bg-green-950/20"
                        : "bg-muted",
                    )}
                  >
                    <p className="text-sm text-muted-foreground mb-1">Filtered Size</p>
                    <p className="text-lg font-medium">{formatFileSize(filteredSize)}</p>
                  </div>
                </div>

                {filterStatus === "applying" && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Applying filters...
                      </span>
                      <span className="text-sm font-medium">{Math.round(filterProgress)}%</span>
                    </div>
                    <Progress value={filterProgress} className="h-2" />
                  </div>
                )}

                <div
                  className={cn(
                    "p-4 rounded-lg mb-6 transition-all duration-300",
                    filterStatus === "complete" && filteredSize < originalSize
                      ? "bg-green-50 dark:bg-green-950/20"
                      : "bg-muted",
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-muted-foreground">Size Reduction</p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        filterStatus === "complete" && filteredSize < originalSize
                          ? "text-green-600 dark:text-green-400"
                          : "",
                      )}
                    >
                      {calculateSizeReduction()}
                    </p>
                  </div>
                  <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-2.5 rounded-full transition-all duration-1000 ease-out",
                        filterStatus === "complete" ? "bg-green-500" : "bg-primary",
                      )}
                      style={{
                        width: `${((originalSize - filteredSize) / originalSize) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {filteredData.length > 0
                      ? `${filteredData.length - 1} of ${csvData.length - 1} rows after filtering`
                      : "No data after filtering"}
                  </p>
                  <Button
                    onClick={downloadFilteredCSV}
                    disabled={filteredData.length <= 1 || filterStatus === "applying" || !downloadReady}
                    className={cn("transition-all", downloadReady ? "animate-pulse" : "")}
                    variant={downloadReady ? "default" : "outline"}
                  >
                    {filterStatus === "applying" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileDown className={cn("h-4 w-4 mr-2", downloadReady ? "animate-bounce" : "")} />
                    )}
                    {downloadReady ? "Download Ready" : "Download Filtered CSV"}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Filter Options */}
          <div>
            <Card
              className={cn("p-6 transition-all duration-300", fileStatus === "ready" ? "opacity-100" : "opacity-70")}
            >
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2 text-muted-foreground" />
                Filter Options
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Select domain extensions to keep:</p>

              <div className="space-y-3 mb-6">
                {POPULAR_TLDS.map((extension) => (
                  <div
                    key={extension.id}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-md transition-colors",
                      selectedTLDs.includes(extension.id) ? "bg-muted" : "",
                      !hasNameColumn || fileStatus !== "ready" ? "opacity-50" : "",
                    )}
                  >
                    <Checkbox
                      id={extension.id}
                      checked={selectedTLDs.includes(extension.id)}
                      onCheckedChange={() => handleExtensionToggle(extension.id)}
                      disabled={!hasNameColumn || fileStatus !== "ready" || filterStatus === "applying"}
                      className={cn(selectedTLDs.includes(extension.id) ? "border-primary" : "")}
                    />
                    <Label htmlFor={extension.id} className="text-sm cursor-pointer w-full">
                      {extension.label}
                    </Label>
                  </div>
                ))}
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        className="w-full relative overflow-hidden"
                        onClick={applyFilter}
                        disabled={
                          !hasNameColumn ||
                          selectedTLDs.length === 0 ||
                          fileStatus !== "ready" ||
                          filterStatus === "applying"
                        }
                      >
                        {filterStatus === "applying" ? (
                          <>
                            <span className="opacity-0">Apply Filter</span>
                            <Loader2 className="h-4 w-4 animate-spin absolute" />
                          </>
                        ) : filterStatus === "complete" ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Filters Applied
                          </>
                        ) : (
                          <>Apply Filter</>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!hasNameColumn && (
                    <TooltipContent>
                      <p>Upload a CSV with a &apos;name&apos; column first</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              {selectedTLDs.length > 0 && fileStatus === "ready" && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {selectedTLDs.length} extension{selectedTLDs.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground"> {new Date().getFullYear()} Domain Filter Tool</p>
        </div>
      </footer>
    </div>
  )
}
