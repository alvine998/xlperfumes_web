import Image from "next/image";
import { Printer, QrCode } from "lucide-react";

type ProductBarcodeCardProps = {
  barcode: string;
  qrCode?: string;
  onPrint: () => void;
};

export function ProductBarcodeCard({ barcode, qrCode, onPrint }: ProductBarcodeCardProps) {
  return (
    <article className="product-barcode-card">
      <span className="product-barcode-qr-label"><QrCode aria-hidden="true" /> Kode QR</span>
      {qrCode ? <Image src={qrCode} alt={`Kode QR ${barcode}`} width={180} height={180} unoptimized /> : <div className="product-barcode-qr-loading">Membuat kode QR…</div>}
      <div className="product-barcode-code"><span>Kode Barcode</span><strong>{barcode}</strong></div>
      <button className="product-barcode-print-one" type="button" onClick={onPrint} disabled={!qrCode}><Printer aria-hidden="true" /> Cetak</button>
    </article>
  );
}
