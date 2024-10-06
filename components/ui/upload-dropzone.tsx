// src/components/ui/upload-dropzone.tsx
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils"; // shadcn utility for classnames
import { useCallback } from "react";
import { Button } from "@/components/ui/button"; // Example shadcn button

export const UploadDropzone = () => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log(acceptedFiles); // Handle files
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex justify-center items-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg",
        isDragActive ? "bg-gray-100" : ""
      )}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p className="text-gray-700">Drop the files here...</p>
      ) : (
        <p className="text-gray-500">Drag & drop files here, or click to select files</p>
      )}
      <Button variant="outline" className="ml-4">
        Select Files
      </Button>
    </div>
  );
};
