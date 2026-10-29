"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/skeleton";

/**
 * Recharts is the heaviest dependency in the app: load it only when an admin chart is on
 * screen, never in the worker bundle. The skeleton keeps the layout from jumping.
 */
export const LazyBarChart = dynamic(() => import("./bar-chart-card"), {
  ssr: false,
  loading: () => <Skeleton className="h-[19rem] w-full rounded-card" />,
});
