declare module 'xlsx-populate' {
  interface Workbook {
    sheet(index: number | string): Sheet;
  }

  interface Sheet {
    usedRange(): Range | undefined;
    name(): string;
  }

  interface Range {
    value(): unknown[][];
  }

  const XlsxPopulate: {
    fromDataAsync(
      data: Buffer | ArrayBuffer,
      options?: { password?: string },
    ): Promise<Workbook>;
  };

  export default XlsxPopulate;
}
