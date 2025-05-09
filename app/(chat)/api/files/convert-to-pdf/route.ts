import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Promisify the libreoffice-convert function
const convertAsync = promisify(libre.convert);

/**
 * Convert various document formats to PDF
 * Supported formats: docx, doc, pptx, ppt, xlsx, xls, txt, csv
 */
export async function POST(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Extract file from request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`Converting file: ${file.name} (${file.type}) to PDF`);

    // Extract file extension
    const fileExt = path.extname(file.name).toLowerCase();

    // If it's already a PDF, just pass it through
    if (file.type === 'application/pdf' || fileExt === '.pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Generate a unique filename with the original name preserved
      const pdfFilename = `${path.basename(file.name, fileExt)}_${uuidv4().slice(0, 8)}.pdf`;

      // Upload the PDF directly
      const data = await put(pdfFilename, fileBuffer, { access: 'public' });

      return NextResponse.json({
        url: data.url,
        pathname: data.pathname,
        contentType: 'application/pdf'
      });
    }

    // Create temp files for processing
    const tempInputPath = path.join(os.tmpdir(), `${uuidv4()}${fileExt}`);
    const tempOutputPath = path.join(os.tmpdir(), `${uuidv4()}.pdf`);

    // Write the uploaded file to the temp input path
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempInputPath, fileBuffer);

    // Handle plain text files specially (text/plain, csv) since libreoffice may not handle them well
    if (file.type === 'text/plain' || file.type === 'text/csv' || fileExt === '.txt' || fileExt === '.csv') {
      // For text-based files, we can use a specialized text-to-PDF approach
      // For simplicity, we'll just convert them with libreoffice
      try {
        const pdfBuffer = await convertAsync(fileBuffer, '.pdf', undefined);

        // Generate a unique filename with the original name preserved
        const originalName = path.basename(file.name, fileExt);
        const pdfFilename = `${originalName}_${uuidv4().slice(0, 8)}.pdf`;

        // Upload the converted PDF
        const data = await put(pdfFilename, pdfBuffer, { access: 'public' });

        return NextResponse.json({
          url: data.url,
          pathname: data.pathname,
          contentType: 'application/pdf'
        });
      } catch (error) {
        console.error('Text conversion error:', error);
        return NextResponse.json({ error: 'Failed to convert text file to PDF' }, { status: 500 });
      }
    }

    try {
      // Convert the document to PDF using libreoffice
      const pdfBuffer = await convertAsync(fileBuffer, '.pdf', undefined);

      // Generate a unique filename with the original name preserved
      const originalName = path.basename(file.name, fileExt);
      const pdfFilename = `${originalName}_${uuidv4().slice(0, 8)}.pdf`;

      // Upload the converted PDF
      const data = await put(pdfFilename, pdfBuffer, { access: 'public' });

      return NextResponse.json({
        url: data.url,
        pathname: data.pathname,
        contentType: 'application/pdf',
        originalFile: {
          name: file.name,
          type: file.type
        }
      });
    } catch (error) {
      console.error('Document conversion error:', error);
      return NextResponse.json({
        error: 'Failed to convert document to PDF',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    } finally {
      // Clean up temp files
      if (fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({
      error: 'Failed to process conversion request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}