import type { Attachment } from "ai";
import { useEffect, useState } from "react";
import { FileIcon, TrashIcon } from "./icons";
import { Button } from "./ui/button";
import { 
  Loader2,
  FileText, 
  FileSpreadsheet, 
  Image as FileImage, 
  File as FilePdf, 
  FileCode, 
  FileJson, 
  FileArchive,
  Presentation
} from "lucide-react";
import { ImagePreviewModal } from "./image-preview-modal";

// Extend the Attachment type to include optional size property
interface ExtendedAttachment extends Attachment {
  size?: number;
  originalFile?: {
    name: string;
    type: string;
    size?: number;
  }
}

interface PreviewAttachmentProps {
  attachment: ExtendedAttachment;
  onRemove?: () => void;
  isUploading?: boolean;
}

export function PreviewAttachment({
  attachment,
  onRemove,
  isUploading = false,
}: PreviewAttachmentProps) {
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");

  // Extract file extension and set filename on mount
  useEffect(() => {
    // Get clean filename - prefer originalFile.name if available, otherwise clean up server filename
    let newFilename = "";
    
    if (attachment.originalFile?.name) {
      // Use the original filename if available (for converted docs)
      newFilename = attachment.originalFile.name;
    } else if (attachment.name) {
      // For server-provided filename, remove any UUIDs or IDs
      const serverName = attachment.name.split("/").pop() || "file";
      
      // If format is like "filename_a1b2c3d4.ext", strip out the ID part
      if (serverName.includes("_")) {
        // Try to match pattern like name_id.extension
        const match = serverName.match(/(.+?)_[a-zA-Z0-9]{8,}\.([^.]+)$/);
        if (match) {
          // Reconstruct as name.extension
          newFilename = `${match[1]}.${match[2]}`;
        } else {
          newFilename = serverName;
        }
      } else {
        newFilename = serverName;
      }
    }
    
    setFilename(newFilename || "file");

    // Create a URL for images to preview
    if (attachment.url && attachment.contentType?.startsWith("image/")) {
      setPreviewUrl(attachment.url);
    } else {
      setPreviewUrl(null);
    }
    
    // Determine file type display text based on content type or extension
    const determineFileType = () => {
      // If we have originalFile information, prioritize that for display
      if (attachment.originalFile?.type) {
        // Use original file type for display
        if (attachment.originalFile.type.startsWith("image/")) {
          return attachment.originalFile.type.split('/')[1].toUpperCase();
        } else if (attachment.originalFile.type === "application/pdf") {
          return "PDF";
        } else if (attachment.originalFile.type.includes("wordprocessingml") || 
                   attachment.originalFile.type === "application/msword") {
          return "DOCX";
        } else if (attachment.originalFile.type.includes("spreadsheetml") ||
                   attachment.originalFile.type.includes("excel")) {
          return "XLSX"; 
        } else if (attachment.originalFile.type.includes("presentationml") ||
                   attachment.originalFile.type.includes("powerpoint")) {
          return "PPTX";
        } else if (attachment.originalFile.type.includes("text/plain")) {
          return "TXT";
        } else if (attachment.originalFile.type.includes("text/csv")) {
          return "CSV";
        }
        
        // If we have originalFile.name, try to get extension from it
        if (attachment.originalFile.name) {
          const ext = attachment.originalFile.name.split('.').pop()?.toUpperCase();
          if (ext) return ext;
        }
      }
      
      // Fallback to current content type if no originalFile info
      if (!attachment.contentType) {
        const extension = newFilename.split('.').pop()?.toUpperCase() || "";
        return extension.length > 0 ? extension : "Unknown";
      }
      
      if (attachment.contentType.startsWith("image/")) {
        return attachment.contentType.split('/')[1].toUpperCase();
      } else if (attachment.contentType === "application/pdf") {
        return "PDF";
      } else if (attachment.contentType.includes("wordprocessingml") || 
                 attachment.contentType === "application/msword") {
        return "DOCX";
      } else if (attachment.contentType.includes("spreadsheetml") ||
                 attachment.contentType.includes("excel")) {
        return "XLSX"; 
      } else if (attachment.contentType.includes("presentationml") ||
                 attachment.contentType.includes("powerpoint")) {
        return "PPTX";
      } else if (attachment.contentType.includes("text/plain")) {
        return "TXT";
      } else if (attachment.contentType.includes("application/json")) {
        return "JSON";
      } else if (attachment.contentType.includes("text/html")) {
        return "HTML";
      } else if (attachment.contentType.includes("text/css")) {
        return "CSS";
      } else if (attachment.contentType.includes("text/javascript") ||
                 attachment.contentType.includes("application/javascript")) {
        return "JS";
      } else {
        // Try to parse from the filename if contentType is generic
        const extension = newFilename.split('.').pop()?.toUpperCase() || "";
        return extension.length > 0 ? extension : "File";
      }
    };
    
    setFileType(determineFileType());
    
    // Calculate file size if we have blob or attachment.size
    if (attachment.size) {
      setFileSize(formatFileSize(attachment.size));
    } else if (attachment.originalFile?.size) {
      // Try to get size from originalFile if present (for converted documents)
      setFileSize(formatFileSize(attachment.originalFile.size));
    } else {
      // Try to extract size from Data URLs
      if (attachment.url?.startsWith('data:')) {
        try {
          // For data URLs, we can estimate the size from the base64 content
          const base64Content = attachment.url.split(',')[1];
          if (base64Content) {
            // Base64 encoding increases size by roughly 4/3, so we adjust accordingly
            const approximateSize = Math.floor((base64Content.length * 3) / 4);
            setFileSize(formatFileSize(approximateSize));
          }
        } catch (error) {
          console.error("Error calculating file size from data URL", error);
        }
      }
    }
  }, [attachment.url, attachment.contentType, attachment.name, attachment.size, attachment.originalFile]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
  };

  // Function to handle preview click
  const handlePreviewClick = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid UI refresh/rerender
    e.stopPropagation();
    e.preventDefault();
    
    if (attachment.contentType?.startsWith("image/") && previewUrl) {
      setIsImagePreviewOpen(true);
    }
  };

  // Determine file type icon - use original file type for icon selection if available
  const getFileIcon = () => {
    // Check for original file type first
    const effectiveType = attachment.originalFile?.type || attachment.contentType;
    
    if (!effectiveType) {
      return <FileIcon size={16} />;
    }
    
    if (effectiveType.startsWith("image/")) {
      return <FileImage size={16} stroke="rgb(59 130 246)" />;
    } else if (effectiveType === "application/pdf") {
      return <FilePdf size={16} stroke="rgb(239 68 68)" />;
    } else if (effectiveType.includes("wordprocessingml") || 
               effectiveType === "application/msword") {
      return <FileText size={16} stroke="rgb(29 78 216)" />;
    } else if (effectiveType.includes("spreadsheetml") ||
               effectiveType.includes("excel")) {
      return <FileSpreadsheet size={16} stroke="rgb(22 163 74)" />; 
    } else if (effectiveType.includes("presentationml") ||
               effectiveType.includes("powerpoint")) {
      return <Presentation size={16} stroke="rgb(249 115 22)" />;
    } else if (effectiveType.includes("text/plain")) {
      return <FileText size={16} stroke="rgb(75 85 99)" />;
    } else if (effectiveType.includes("text/csv")) {
      return <FileSpreadsheet size={16} stroke="rgb(16 185 129)" />;
    } else if (effectiveType.includes("application/json")) {
      return <FileJson size={16} stroke="rgb(234 179 8)" />;
    } else if (effectiveType.includes("text/html") || 
              effectiveType.includes("text/css") || 
              effectiveType.includes("javascript")) {
      return <FileCode size={16} stroke="rgb(168 85 247)" />;
    } else if (effectiveType.includes("application/zip") || 
              effectiveType.includes("application/x-rar")) {
      return <FileArchive size={16} stroke="rgb(146 64 14)" />;
    } else {
      return <FileIcon size={16} />;
    }
  };

  // Simple filename truncation that only truncates at the end
  const displayName = filename.length > 20 
    ? filename.substring(0, 20) + "..."
    : filename;

  return (
    <>
      <div 
        className="group relative flex items-center gap-2 rounded-md border bg-background p-2 shadow-sm"
        data-testid="attachment-preview"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            getFileIcon()
          )}
        </div>
        
        <div className="flex flex-col">
          <div 
            className="max-w-[140px] truncate text-sm font-medium"  
            title={filename}
          >
            {displayName}
          </div>
          <div className="text-xs text-muted-foreground">
            {isUploading
              ? "Loading..."
              : attachment.contentType?.startsWith("image/")
              ? "Click to preview"
              : `${fileType}${fileSize ? ` • ${fileSize}` : ""}`}
          </div>
        </div>

        {onRemove && !isUploading && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-1 -top-1 size-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <TrashIcon size={12} />
            <span className="sr-only">Remove attachment</span>
          </Button>
        )}
        
        {/* Make only images clickable for previews */}
        {!isUploading && attachment.contentType?.startsWith("image/") && (
          <button 
            className="absolute inset-0 cursor-pointer" 
            onClick={handlePreviewClick}
            aria-label="Preview image"
          />
        )}
      </div>
      
      {/* Image Preview Modal */}
      {previewUrl && (
        <ImagePreviewModal
          isOpen={isImagePreviewOpen}
          onClose={() => setIsImagePreviewOpen(false)}
          imageUrl={previewUrl}
          alt={filename}
        />
      )}
    </>
  );
}
