import React from "react";
import { AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { Zone } from "../types";

interface TopAlertBannerProps {
  criticalZone: Zone | null;
  onDispatchAlert: (zone: Zone) => void;
}

export default function TopAlertBanner({ criticalZone, onDispatchAlert }: TopAlertBannerProps) {
  if (!criticalZone) return null;

  return (
    <div id="top-alert-banner" className="bg-red-50 border-b border-red-200 text-red-900 px-4 py-3 sm:px-6 relative shadow-md animate-pulse">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-500 text-white p-1.5 rounded-full animate-ping absolute h-8 w-8 opacity-25"></div>
          <div className="bg-red-600 text-white p-1.5 rounded-full relative z-10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans font-semibold tracking-wide text-sm md:text-base flex items-center gap-2">
              <span className="text-red-700 uppercase font-bold">Critical Event:</span>
              <span className="text-red-900">Extreme Crowd Buildup at {criticalZone.name}</span>
            </h3>
            <p className="text-xs text-red-700 font-mono mt-0.5">
              Current density is <span className="font-bold underline text-red-800">{criticalZone.density}%</span> ({criticalZone.currentCount} / {criticalZone.capacity} capacity). Evacuation threshold breached!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs text-red-700 font-mono hidden lg:inline-block">
            Emergency Evac Corridor: <strong className="text-red-900">{criticalZone.nearestExit}</strong>
          </span>
          <button
            id={`btn-banner-dispatch-${criticalZone.id}`}
            onClick={() => onDispatchAlert(criticalZone)}
            className="w-full md:w-auto px-4 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-mono text-xs font-bold rounded border border-red-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <ShieldAlert className="h-4 w-4" />
            DISPATCH ALERTS (CALL + SMS)
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
