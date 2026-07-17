import React, { useState } from "react";
import { Users, AlertCircle, Camera, Play, Sparkles } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";
import { Zone } from "../types";

interface ZoneCardsProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
  onRunYoloDetection: (zoneId: string, count: number) => void;
}

export default function ZoneCards({ zones, selectedZone, onSelectZone, onRunYoloDetection }: ZoneCardsProps) {
  const [customCounts, setCustomCounts] = useState<{ [zoneId: string]: string }>({});

  const handleYoloClick = (zone: Zone) => {
    // Generate a simulated YOLO detection count
    let count = Math.round(zone.capacity * 0.45); // normal
    if (zone.id === "z2") {
      // Stage front spikes high
      count = Math.round(zone.capacity * 0.92);
    } else if (zone.id === "z3") {
      count = Math.round(zone.capacity * 0.68);
    }
    onRunYoloDetection(zone.id, count);
  };

  const handleCustomYoloSubmit = (zoneId: string, capacity: number) => {
    const rawVal = customCounts[zoneId];
    if (!rawVal) return;
    const count = Math.max(0, Math.min(capacity, parseInt(rawVal) || 0));
    onRunYoloDetection(zoneId, count);
    setCustomCounts(prev => ({ ...prev, [zoneId]: "" }));
  };

  return (
    <div id="zone-cards-panel" className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Zone Density Monitoring</h2>
          <p className="text-[10px] text-sky-600 font-mono font-bold">5 ACTIVE TELEMETRY STATIONS</p>
        </div>
        <div className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[9px] font-mono flex items-center gap-1.5 font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_6px_#0284c7]"></span>
          REALTIME STREAM
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {zones.map((zone) => {
          const isSelected = selectedZone?.id === zone.id;
          
          // Status classes matching technical dashboard for light theme
          const statusColors = {
            safe: {
              border: "border-emerald-200",
              glow: "shadow-sm",
              text: "text-emerald-700",
              bg: "bg-emerald-50",
              pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
              borderL: "border-l-4 border-emerald-500"
            },
            warning: {
              border: "border-amber-200",
              glow: "shadow-sm",
              text: "text-amber-700",
              bg: "bg-amber-50",
              pill: "bg-amber-50 text-amber-700 border-amber-200",
              borderL: "border-l-4 border-amber-500"
            },
            critical: {
              border: "border-red-200",
              glow: "shadow-md shadow-red-50/50",
              text: "text-red-700",
              bg: "bg-red-50",
              pill: "bg-red-50 text-red-700 border-red-200 animate-pulse",
              borderL: "border-l-4 border-red-500"
            }
          }[zone.status];

          // Format sparkline data for recharts
          const sparkData = zone.sparkline.map((val, idx) => ({ id: idx, value: val }));

          return (
            <div
              id={`zone-card-${zone.id}`}
              key={zone.id}
              onClick={() => onSelectZone(zone)}
              className={`p-3.5 rounded bg-white border transition-all cursor-pointer select-none group shadow-sm ${statusColors.borderL} ${statusColors.glow} ${
                isSelected 
                  ? "border-sky-500 ring-2 ring-sky-500/20" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800 group-hover:text-slate-950 transition-colors">
                    {zone.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase border ${statusColors.pill}`}>
                      {zone.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Cap: {zone.capacity}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className={`text-lg font-mono font-bold leading-none ${statusColors.text}`}>
                    {zone.density}%
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    Density
                  </span>
                </div>
              </div>

              {/* Progress Bar & Readouts */}
              <div className="grid grid-cols-12 gap-3 items-center mt-3.5">
                <div className="col-span-8">
                  {/* Visual Density Meter */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        zone.status === "critical"
                          ? "bg-red-500"
                          : zone.status === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, zone.density)}%` }}
                    ></div>
                  </div>
                  
                  {/* Detailed Counts */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono mt-2">
                    <Users className="h-3 w-3 text-sky-600 font-bold" />
                    <span>Count:</span>
                    <span className="text-slate-800 font-bold">{zone.currentCount}</span>
                    <span className="text-slate-400">/</span>
                    <span>{zone.capacity}</span>
                  </div>
                </div>

                {/* Sparkline Chart */}
                <div className="col-span-4 h-10 w-full opacity-90 group-hover:opacity-100 transition-opacity">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
                      <YAxis domain={[0, 100]} hide={true} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={
                          zone.status === "critical"
                            ? "#dc2626"
                            : zone.status === "warning"
                              ? "#d97706"
                              : "#16a34a"
                        }
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* YOLO Simulation Trigger Bar inside Zone Card */}
              <div 
                className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()} // Stop selection bubbling
              >
                <div className="flex items-center gap-1">
                  <input
                    id={`yolo-input-${zone.id}`}
                    type="number"
                    value={customCounts[zone.id] || ""}
                    onChange={(e) => setCustomCounts({ ...customCounts, [zone.id]: e.target.value })}
                    placeholder="People"
                    className="w-16 bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-mono px-1.5 py-1 rounded focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                  />
                  <button
                    id={`yolo-submit-${zone.id}`}
                    onClick={() => handleCustomYoloSubmit(zone.id, zone.capacity)}
                    className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    title="Simulate YOLO count"
                  >
                    Set
                  </button>
                </div>

                <button
                  id={`btn-yolo-${zone.id}`}
                  onClick={() => handleYoloClick(zone)}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded text-[10px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="h-3 w-3 text-sky-600 font-bold" />
                  YOLO Feed
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
