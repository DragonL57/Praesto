import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogOverlay
} from './ui/dialog';
import { Button } from './ui/button';

// VisuallyHidden component for accessibility
const VisuallyHidden = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <span
      className="absolute size-px -m-px overflow-hidden clip-[rect(0,_0,_0,_0)] whitespace-nowrap border-0"
    >
      {children}
    </span>
  )
}

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export const DocumentPreviewModal = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: DocumentPreviewModalProps) => {
  
  // Handle download button click
  const handleDownload = () => {
    // Create an anchor element and trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open file in new tab
  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  // Determine if the file type can be previewed within an iframe
  const canPreviewInline = (type: string) => {
    return type === 'text/plain' || type === 'text/csv';
  };

  // Function to check if file is PDF
  const isPDF = (type: string) => {
    return type === 'application/pdf';
  };

  // ID for connecting DialogDescription and DialogContent's aria-describedby
  const descriptionId = `document-preview-description-${fileName.replace(/\W/g, '-')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="backdrop-blur-sm" />
      <DialogContent 
        className="border p-0 max-w-4xl w-[90vw] max-h-[98vh] h-[98vh] overflow-hidden"
        aria-describedby={descriptionId}
      >
        {/* Add DialogTitle with VisuallyHidden for accessibility */}
        <DialogTitle asChild>
          <VisuallyHidden>Document Preview - {fileName}</VisuallyHidden>
        </DialogTitle>
        
        {/* Add DialogDescription with VisuallyHidden for accessibility */}
        <DialogDescription id={descriptionId} asChild>
          <VisuallyHidden>
            Preview of document: {fileName}. You can download this file or open it in a new tab. Press Escape to close.
          </VisuallyHidden>
        </DialogDescription>
        
        <div className="flex flex-col h-full bg-background">
          {/* Header with actions */}
          <div className="flex items-center justify-between p-3 border-b shrink-0">
            <h3 className="font-medium truncate max-w-[calc(100%-100px)]">{fileName}</h3>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleDownload} 
                variant="outline" 
                size="icon" 
                className="size-8"
                aria-label="Download file"
              >
                <Download size={16} />
              </Button>
              <Button 
                onClick={handleOpenInNewTab} 
                variant="outline" 
                size="icon" 
                className="size-8"
                aria-label="Open in new tab"
              >
                <ExternalLink size={16} />
              </Button>
              <Button 
                onClick={onClose} 
                variant="outline" 
                size="icon" 
                className="size-8"
                aria-label="Close preview"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
          
          {/* Document Preview Area - Increased vertical space */}
          <div className="flex-1 overflow-auto bg-muted h-full">
            {canPreviewInline(fileType) ? (
              <iframe
                src={fileUrl}
                className="size-full border-0"
                title={`Preview of ${fileName}`}
                sandbox="allow-same-origin allow-scripts"
                loading="lazy"
              />
            ) : isPDF(fileType) ? (
              <div className="flex flex-col items-center justify-center size-full">
                <object
                  data={fileUrl}
                  type="application/pdf"
                  className="size-full"
                >
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p className="mb-4">Your browser cannot display this PDF inline.</p>
                    <div className="flex gap-3">
                      <Button onClick={handleDownload} variant="default">
                        <Download size={16} className="mr-2" />
                        Download PDF
                      </Button>
                      <Button onClick={handleOpenInNewTab} variant="outline">
                        <ExternalLink size={16} className="mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                  </div>
                </object>
              </div>
            ) : (
              // Fallback for non-previewable files
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <p className="mb-4">This file type cannot be previewed directly.</p>
                <div className="flex gap-3">
                  <Button onClick={handleDownload} variant="default">
                    <Download size={16} className="mr-2" />
                    Download File
                  </Button>
                  <Button onClick={handleOpenInNewTab} variant="outline">
                    <ExternalLink size={16} className="mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};