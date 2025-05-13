import React, { useState, useRef } from "react";
import { parseSpreadsheet, ParsedRow } from "../utils/spreadsheetParser";

interface SpreadsheetUploaderProps {
  onFileLoaded: (data: any[]) => void;
  onError: (error: string) => void;
}

const SpreadsheetUploader: React.FC<SpreadsheetUploaderProps> = ({
  onFileLoaded,
  onError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    try {
      // Replace dynamic import with direct usage
      const data = await parseSpreadsheet(file);
      onFileLoaded(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Set the file to the input element so we can reuse the same handler
    if (fileInputRef.current) {
      // This is not fully supported in all browsers but we'll keep it for now
      // We use the handleFileChange directly after this anyway
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;

      handleFileChange({
        target: { files: dataTransfer.files },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Drag and drop file upload area"
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          <div className="text-xl font-medium">
            {isLoading
              ? "Processing file..."
              : "Drop your Excel or CSV file here"}
          </div>

          <div className="text-sm text-gray-500">
            {fileName ? `Selected: ${fileName}` : "or click to browse"}
          </div>

          {/* Add a visually hidden but accessible label for the file input */}
          <label htmlFor="file-upload" className="sr-only">
            Upload Excel or CSV file
          </label>

          <input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            aria-label="Upload Excel or CSV file"
            title="Upload Excel or CSV file"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            aria-controls="file-upload"
          >
            {isLoading ? "Processing..." : "Select file"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetUploader;
