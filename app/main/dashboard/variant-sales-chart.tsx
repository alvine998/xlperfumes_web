"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="chart-loading" role="status">Memuat grafik penjualan…</div>,
});

type VariantDatum = {
  label: string;
  count: number;
};

type VariantSalesChartProps = {
  data: VariantDatum[];
};

export function VariantSalesChart({ data }: VariantSalesChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Arial, sans-serif",
      foreColor: "#898477",
      animations: { enabled: true, speed: 350 },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "48%",
        borderRadius: 3,
        borderRadiusApplication: "end",
        distributed: true,
      },
    },
    colors: ["#687052", "#85886b", "#a3a083", "#b9a985", "#c5bda9"],
    dataLabels: { enabled: true, textAnchor: "start", offsetX: 8, style: { fontSize: "11px", fontWeight: 500, colors: ["#5c5a50"] }, formatter: (value) => new Intl.NumberFormat("id-ID").format(Number(value)) },
    xaxis: {
      categories: data.map((item) => item.label),
      min: 0,
      labels: { formatter: (value) => new Intl.NumberFormat("id-ID").format(Number(value)), style: { fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: ["#555347"] } } },
    grid: { borderColor: "#ece8df", strokeDashArray: 3, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } }, padding: { left: 8, right: 28 } },
    legend: { show: false },
    tooltip: { y: { formatter: (value) => `${new Intl.NumberFormat("id-ID").format(value ?? 0)} unit` } },
    states: { hover: { filter: { type: "lighten", value: 0.06 } }, active: { filter: { type: "none" } } },
  };

  return <div className="variant-chart"><Chart options={options} series={[{ name: "Unit terjual", data: data.map((item) => item.count) }]} type="bar" height={280} /></div>;
}
