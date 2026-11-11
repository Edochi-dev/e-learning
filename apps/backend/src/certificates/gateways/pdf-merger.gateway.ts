export abstract class PdfMergerGateway {
  /** One PDF with every page of `pdfs`, in order. */
  abstract merge(pdfs: Buffer[]): Promise<Buffer>;
}
