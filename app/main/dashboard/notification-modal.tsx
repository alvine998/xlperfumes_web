"use client";

import { useRef, useState } from "react";

const notifications = [
  { id: "stock", title: "Pembaruan stok selesai", detail: "Data stok seluruh cabang berhasil diperbarui.", time: "10 menit lalu" },
  { id: "sales", title: "Penjualan bulanan tersedia", detail: "Laporan penjualan November sudah siap ditinjau.", time: "1 jam lalu" },
  { id: "damaged", title: "Perlu tindak lanjut", detail: "Ada 12 unit rusak yang tercatat di gudang.", time: "Kemarin" },
];

export function NotificationModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [unreadIds, setUnreadIds] = useState(() => notifications.map((notification) => notification.id));

  function handleMarkAllRead() {
    setUnreadIds([]);
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      dialogRef.current?.close();
    }
  }

  return (
    <>
      <button
        className="icon-button notification-trigger"
        type="button"
        aria-label={`Notifikasi${unreadIds.length > 0 ? `, ${unreadIds.length} belum dibaca` : ""}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        <BellIcon />
        {unreadIds.length > 0 && <span className="notification-badge" aria-hidden="true">{unreadIds.length}</span>}
      </button>

      <dialog
        ref={dialogRef}
        className="notification-dialog"
        aria-labelledby="notification-title"
        onClick={handleBackdropClick}
      >
        <section className="notification-panel">
          <header className="notification-header">
            <div><span className="dashboard-eyebrow">PUSAT INFORMASI</span><h2 id="notification-title">Notifikasi <span>{unreadIds.length}</span></h2></div>
            <button className="notification-close" type="button" aria-label="Tutup notifikasi" onClick={() => dialogRef.current?.close()}>×</button>
          </header>
          <div className="notification-actions">
            <span>{unreadIds.length > 0 ? `${unreadIds.length} belum dibaca` : "Semua sudah dibaca"}</span>
            {unreadIds.length > 0 && <button type="button" onClick={handleMarkAllRead}>Tandai semua dibaca</button>}
          </div>
          <ul className="notification-list">
            {notifications.map((notification) => {
              const isUnread = unreadIds.includes(notification.id);
              return (
                <li className={`notification-item${isUnread ? " is-unread" : ""}`} key={notification.id}>
                  <span className="notification-item-dot" aria-hidden="true" />
                  <div><strong>{notification.title}</strong><p>{notification.detail}</p><time>{notification.time}</time></div>
                </li>
              );
            })}
          </ul>
          <footer className="notification-footer">Notifikasi contoh untuk dashboard</footer>
        </section>
      </dialog>
    </>
  );
}

function BellIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15.5 8a5.5 5.5 0 0 0-11 0c0 6-2 6.5-2 7h15c0-.5-2-1-2-7ZM8 18h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
