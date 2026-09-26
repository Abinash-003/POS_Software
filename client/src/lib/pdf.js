/**
 * Renders a DOM node to a single-page PDF.
 *
 * The receipt is rasterised rather than typeset with jsPDF's built-in fonts,
 * because those fonts cannot render Tamil script. Capturing the already
 * laid-out DOM keeps the bill identical in both languages.
 *
 * `html2canvas-pro` is used instead of `html2canvas` since it understands the
 * modern CSS color functions Tailwind emits.
 */
export async function elementToPdf(element, filename) {
  if (!element) throw new Error("No element to export");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: Math.min(window.devicePixelRatio * 2, 3),
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;

  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);

  const width = canvas.width * ratio;
  const height = canvas.height * ratio;

  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.95),
    "JPEG",
    (pageWidth - width) / 2,
    margin,
    width,
    height
  );
  pdf.save(filename);
}
