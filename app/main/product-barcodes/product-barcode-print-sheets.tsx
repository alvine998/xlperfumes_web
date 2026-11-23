import Image from "next/image";
import type { PrintMode } from "./product-barcode-filters";

type PrintableProduct = {
  id: number;
  barcode: string;
  variantName: string | null;
};

type ProductBarcodePrintSheetsProps = {
  products: PrintableProduct[];
  qrCodes: Record<string, string>;
  mode: PrintMode;
};

export function ProductBarcodePrintSheets({ products, qrCodes, mode }: ProductBarcodePrintSheetsProps) {
  const columns = 9;
  const rows = 8;
  const pageSize = columns * rows;
  const sheets = Array.from({ length: Math.ceil(products.length / pageSize) }, (_, index) =>
    products.slice(index * pageSize, (index + 1) * pageSize),
  );

  return (
    <div className={`product-barcode-print-sheets mode-${mode}`} aria-hidden="true">
      {sheets.map((sheet, sheetIndex) => (
        <section className="product-barcode-print-sheet" key={sheetIndex}>
          {sheet.map((product) => (
            <article
              className="product-barcode-print-card"
              data-print-product-id={product.id}
              key={product.id}
            >
              <strong className="product-barcode-print-variant">
                {product.variantName || "Varian belum dipetakan"}
              </strong>
              {qrCodes[product.barcode] ? (
                <Image
                  src={qrCodes[product.barcode]}
                  alt={`Kode QR ${product.barcode}`}
                  width={180}
                  height={180}
                  unoptimized
                />
              ) : <span className="product-barcode-print-qr-placeholder">Kode QR</span>}
              <span className="product-barcode-print-code">{product.barcode}</span>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
