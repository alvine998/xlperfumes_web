"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="chart-loading" role="status">
      Memuat grafik penjualan bulanan…
    </div>
  ),
});

type MonthlySalesDatum = {
  label: string;
  total: number;
};

type MonthlySalesChartProps = {
  data: MonthlySalesDatum[];
};

export function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "Arial, sans-serif",
      foreColor: "#62695c",
      animations: { enabled: true, speed: 350 },
      zoom: { enabled: false },
    },
    colors: ["#72785a"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.2,
        opacityFrom: 0.25,
        opacityTo: 0.02,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: "#fff",
      colors: ["#72785a"],
      hover: { size: 6 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data.map((item) => item.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px" }, rotate: -35, rotateAlways: false },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (value) =>
          new Intl.NumberFormat("id-ID", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value),
        style: { fontSize: "12px" },
      },
    },
    grid: {
      borderColor: "#d2d9cf",
      strokeDashArray: 3,
      padding: { left: 8, right: 12 },
    },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (value) =>
          `${new Intl.NumberFormat("id-ID").format(value ?? 0)} unit`,
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="monthly-chart-empty">
        Pilih rentang tanggal yang valid untuk melihat statistik.
      </div>
    );
  }

  return (
    <div className="monthly-chart">
      <Chart
        options={options}
        series={[{ name: "Penjualan", data: data.map((item) => item.total) }]}
        type="area"
        height={260}
      />
    </div>
  );
}
