import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';

// Define a type for Blob with name property
interface BlobWithFileName extends Blob {
  name?: string;
}

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 25 * 1024 * 1024, {
      message: 'File size should be less than 25MB',
    })
    .refine(
      (file) => {
        // Logging the content type for debugging
        console.log('File type:', file.type);

        // File extension check from name as fallback
        const getExtensionFromName = (name: string) => {
          const parts = name.split('.');
          return parts.length > 1 ? parts.pop()?.toLowerCase() : '';
        };

        const fileName = (file as BlobWithFileName).name || '';
        const extension = getExtensionFromName(fileName);

        // Allowed MIME types - focusing on officeparser and common image formats
        const allowedMimeTypes = [
          // officeparser supported
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/msword', // .doc (though officeparser might be better with .docx)
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
          'application/vnd.ms-powerpoint', // .ppt
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'application/vnd.oasis.opendocument.text', // .odt
          'application/vnd.oasis.opendocument.spreadsheet', // .ods
          'application/vnd.oasis.opendocument.presentation', // .odp
          'text/plain', // .txt
          'text/csv', // .csv
          // Common image types (retained for general use, though not parsed for text by officeparser)
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        // Allowed extensions - for fallback and clarity
        const allowedExtensions = [
          'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'odt', 'ods', 'odp', 'txt', 'csv',
          'jpg', 'jpeg', 'png', 'gif', 'webp',
        ];

        // Check by MIME type first, then by extension as a fallback
        if (allowedMimeTypes.includes(file.type)) {
          return true;
        }
        if (extension && allowedExtensions.includes(extension)) {
          // If MIME type was generic (e.g., application/octet-stream) but extension is known, allow it.
          // This helps with files that might not have a precise MIME type from the client.
          console.log(`Allowing file based on extension: ${extension} for file: ${fileName}`);
          return true;
        }
        // Log rejection if neither matches
        console.warn(`File type not supported: ${file.type}, extension: ${extension}, name: ${fileName}`);
        return false;
      },
      {
        message:
          'Supported file types: PDF, Word (docx, doc), PowerPoint (pptx, ppt), Excel (xlsx, xls), OpenDocument (odt, ods, odp), Text (txt, csv), Images (jpeg, png, gif, webp)',
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

    // Add original name to the Blob instance if not already present for schema validation
    // This is a bit of a workaround because the schema validation might run on a Blob
    // that doesn't have the .name property directly if it's not cast to File first.
    // However, 'file' is already cast to 'File' above, which should have 'name'.
    // For robustness in the schema, we ensure 'name' is available on the object passed to refine.
    const fileForValidation = file as BlobWithFileName;
    if (!fileForValidation.name && file.name) {
      fileForValidation.name = file.name;
    }

    console.log('Uploaded file details (pre-validation):', {
      name: file.name,
      type: file.type,
      size: file.size,
      objectKeys: Object.keys(fileForValidation), // Log all keys of the object being validated
      fileNameForValidation: fileForValidation.name, // Specifically log the name used in validation
      fileTypeForValidation: fileForValidation.type, // Specifically log the type used in validation
    });

    const validatedFile = FileSchema.safeParse({ file: fileForValidation });

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

    const filename = file.name;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Upload to Vercel Blob
      const blobResult = await put(filename, fileBuffer, {
        access: 'public',
        contentType: file.type,
      });

      // Ensure the response includes all necessary fields: url, pathname, contentType, size
      // The 'blobResult' from @vercel/blob put already contains:
      // url, downloadUrl, pathname, contentType, contentDisposition
      // We also want to include the original file size.
      return NextResponse.json({
        ...blobResult,
        size: file.size,
        originalFilename: file.name
      });
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
