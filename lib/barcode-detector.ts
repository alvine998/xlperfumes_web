export type QRCodeScanResult = { rawValue: string };

export type QRCodeDetector = {
  detect(source: HTMLVideoElement | ImageBitmap): Promise<QRCodeScanResult[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => QRCodeDetector;
  }
}

export function createQRCodeDetector(): QRCodeDetector | null {
  const BarcodeDetectorConstructor = window.BarcodeDetector;
  return BarcodeDetectorConstructor
    ? new BarcodeDetectorConstructor({ formats: ["qr_code"] })
    : null;
}
