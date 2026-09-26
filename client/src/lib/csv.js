function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @param {Array<{key: string, label: string, map?: (row: object) => unknown}>} columns
 */
export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.map ? column.map(row) : row[column.key])).join(",")
  );
  return [header, ...body].join("\r\n");
}

export function downloadCsv(filename, content) {
  // The BOM keeps Tamil text readable when the file is opened in Excel.
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
