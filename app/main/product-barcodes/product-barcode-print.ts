import type { PrintMode } from "./product-barcode-filters";

export function printProductBarcodes(mode: PrintMode, target: "all" | "single", productId?: number) {
  const root = document.documentElement;
  document.querySelectorAll<HTMLElement>("[data-print-target]").forEach((element) => {
    delete element.dataset.printTarget;
  });
  if (target === "single" && productId !== undefined) {
    const card = document.querySelector<HTMLElement>(`[data-print-product-id="${productId}"]`);
    const sheet = card?.closest<HTMLElement>(".product-barcode-print-sheet");
    if (!card || !sheet) return;
    card.dataset.printTarget = "true";
    sheet.dataset.printTarget = "true";
  }
  root.dataset.productBarcodePrint = target;
  root.dataset.productBarcodeMode = mode;
  window.addEventListener("afterprint", () => {
    delete root.dataset.productBarcodePrint;
    delete root.dataset.productBarcodeMode;
    document.querySelectorAll<HTMLElement>("[data-print-target]").forEach((element) => {
      delete element.dataset.printTarget;
    });
  }, { once: true });
  window.print();
}
