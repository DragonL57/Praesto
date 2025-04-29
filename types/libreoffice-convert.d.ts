declare module 'libreoffice-convert' {
  /**
   * Convert a document to another format using LibreOffice
   * @param input The input buffer or path to the input file
   * @param outputFormat The output format extension (e.g., '.pdf')
   * @param filter Optional filter to use for the conversion
   * @param callback Callback function that receives (error, resultBuffer)
   */
  export function convert(
    input: Buffer | string,
    outputFormat: string,
    filter: unknown,
    callback: (error: Error | null, resultBuffer: Buffer) => void
  ): void;
}