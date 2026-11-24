import type { Metadata } from "next";
import { Suspense } from "react";
import { MainSidebar } from "../../main-sidebar";
import { requireFeatureAccess } from "@/lib/server-permissions";
import { MainContentLoading } from "../../main-content-loading";
import { NotificationDropdown } from "../../dashboard/notification-dropdown";
import { TodayLabel } from "../../dashboard/today-label";
import { ProfileMenu } from "../../profile-menu";
import { GenerateProducts } from "./generate-products";
import "../../../../styles/dashboard.css";
import "../../../../styles/product-generation.css";

export const metadata: Metadata = {
  title: "Generate Produk | XL Perfumes",
  description: "Buat produk dalam jumlah banyak berdasarkan cabang dan varian.",
};

export default function GenerateProductsPage() {
  return (
    <main className="dashboard-shell">
      <MainSidebar />
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="breadcrumb">INVENTARIS <span>/</span> GENERATE PRODUK</div>
          <div className="topbar-right"><TodayLabel /><NotificationDropdown /><ProfileMenu /></div>
        </header>
        <Suspense fallback={<MainContentLoading />}>
          <AuthorizedGenerateProducts />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthorizedGenerateProducts() {
  await requireFeatureAccess("generate_product");
  return <GenerateProducts />;
}
