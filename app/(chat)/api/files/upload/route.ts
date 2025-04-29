import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/(auth)/auth';

// Define a type for Blob with name property
interface BlobWithFileName extends Blob {
  name?: string;
}

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size should be less than 10MB',
    })
    // Update to accept document file types with more permissive matching
    .refine(
      (file) => {
        // Logging the content type for debugging
        console.log('File type:', file.type);
        
        // File extension check from name as fallback
        const getExtensionFromName = (name: string) => {
          const parts = name.split('.');
          return parts.length > 1 ? parts.pop()?.toLowerCase() : '';
        };
        
        // Get file name if available from formData
        const fileName = (file as BlobWithFileName).name || '';
        const extension = getExtensionFromName(fileName);
        
        // Check if the content type is in our list of allowed types
        const allowedTypes = [
          // Images
          'image/jpeg', 
          'image/png',
          'image/gif',
          // Documents
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
          'application/msword', // doc
          'application/vnd.ms-word',
          'application/vnd.openxmlformats',
          'text/plain',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
          'application/vnd.ms-excel', // xls
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
          'application/vnd.ms-powerpoint', // ppt
        ];
        
        // Also check by file extension for common office formats
        const allowedExtensions = ['pdf', 'docx', 'doc', 'txt', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'];
        
        return allowedTypes.includes(file.type) || 
               (extension && allowedExtensions.includes(extension));
      },
      {
        message: 'Supported file types: Images (JPEG, PNG, GIF), Documents (PDF, DOCX, DOC, TXT, CSV, XLSX, XLS, PPTX, PPT)',
      }
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File; // Changed to File for better type safety
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    console.log('Uploaded file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');
      
      console.error('File validation failed:', errorMessage, {
        file_type: file.type,
        file_name: file.name
      });

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = file.name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: 'public',
      });

      return NextResponse.json(data);
    } catch (error) {
      console.error('Upload to blob storage failed:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing failed:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
