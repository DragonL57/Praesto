import { NextResponse } from 'next/server';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

// Define the maximum file size (e.g., 25MB)
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed MIME types and extensions
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation', // .odp
  'text/plain', // .txt
  'text/csv', // .csv
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// const allowedExtensions = [ // This is no longer used with client-side uploads and handleUpload
//   'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'odt', 'ods', 'odp', 'txt', 'csv',
//   'jpg', 'jpeg', 'png', 'gif', 'webp',
// ];

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname /*, clientPayload */) => {
        // Check authentication
        const session = await auth(); // Using request object might be needed if auth() depends on it
        if (!session || !session.user) {
          throw new Error('Unauthorized: User not authenticated.');
        }

        // Here you can add additional checks based on pathname or clientPayload if needed
        // For example, ensure the user has permission to upload to this specific path.
        // const userCanUpload = canUserUpload(session.user, pathname);
        // if (!userCanUpload) {
        //   throw new Error('User does not have permission for this upload.');
        // }

        return {
          allowedContentTypes: allowedMimeTypes,
          maximumFileSizeInBytes: MAX_FILE_SIZE_BYTES,
          tokenPayload: JSON.stringify({
            userId: session.user.id, // Example: include userId in the token payload
            // originalPathname: pathname, // could be useful
          }),
          // Provide callbackUrl for onUploadCompleted webhook
          callbackUrl:
            process.env.VERCEL_BLOB_CALLBACK_URL ||
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/files/upload`,
          // You can also set a validity period for the token if needed
          // validUntil: Date.now() + 60 * 60 * 1000, // 1 hour from now
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback is invoked after the file is successfully uploaded to Vercel Blob.
        // It's useful for updating your database with the blob's URL and other metadata.
        console.log('Blob upload completed:', blob);
        console.log('Token payload received:', tokenPayload); // Log the raw tokenPayload

        try {
          if (typeof tokenPayload !== 'string') {
            console.warn(
              'onUploadCompleted: tokenPayload is not a string or is missing.',
              tokenPayload,
            );
            // Decide how to handle this: throw error, or proceed if userId is not strictly necessary here
            // For now, let's assume if there's no valid tokenPayload, we can't get userId.
            throw new Error(
              'Invalid or missing tokenPayload for completed upload.',
            );
          }
          const { userId } = JSON.parse(tokenPayload);
          // Example: Update your database
          // await db.users.update({
          //   where: { id: userId },
          //   data: { [blob.pathname]: blob.url }, // Storing URL based on pathname or a specific field
          // });
          console.log(`File uploaded by user ${userId}: ${blob.url}`);
        } catch (error) {
          console.error('Error processing upload completion:', error);
          // Even if this part fails, the file is already in Vercel Blob.
          // Handle this error carefully, e.g., by logging or queuing a retry for DB update.
          // Throwing an error here might cause issues if Vercel Blob expects a 200 OK.
          // The Vercel guide suggests that "The webhook will retry 5 times waiting for a 200".
          // So, if this can fail, ensure it's idempotent or handle retries gracefully.
          throw new Error('Could not complete post-upload processing.');
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('handleUpload error:', message, error);
    return NextResponse.json(
      { error: message },
      { status: 400 }, // The Vercel Blob client SDK expects a 400 for errors during token generation.
    );
  }
}
