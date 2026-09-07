export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Minimal, dependency-free CSV builder (RFC 4180 quoting). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const v = c.value(row);
        return escapeCsvField(v === null || v === undefined ? "" : String(v));
      })
      .join(","),
  );
  return [headerLine, ...lines].join("\r\n");
}
