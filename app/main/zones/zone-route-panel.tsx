import { Route } from "lucide-react";
import type { Store } from "@/lib/stores";
import { ZoneOsmMap } from "./zone-osm-map";

type ZoneRoutePanelProps = {
  stores: Store[];
};

export function ZoneRoutePanel({ stores }: ZoneRoutePanelProps) {
  return (
    <section className="zones-detail-card" aria-labelledby="zone-route-title">
      <header className="zones-detail-card-header">
        <div>
          <span className="dashboard-eyebrow">RUTE OPERASIONAL</span>
          <h2 id="zone-route-title">Rute zona</h2>
          <p>Rute mengikuti urutan toko pada tab Toko.</p>
        </div>
        <span className="zones-detail-count">{stores.length} titik</span>
      </header>
      {stores.length === 0 ? (
        <div className="zones-detail-empty">
          <Route size={23} aria-hidden="true" />
          <strong>Rute belum tersedia</strong>
          <span>Tambahkan toko ke zona ini terlebih dahulu untuk menyiapkan titik rute.</span>
        </div>
      ) : (
        <>
          <ZoneOsmMap stores={stores} />
          <ol className="zones-route-stop-list" aria-label="Titik rute zona">
            {stores.map((store, index) => (
              <li key={store.id}>
                <span className="zones-route-stop-marker">
                  {index + 1}
                </span>
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.address}</small>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
