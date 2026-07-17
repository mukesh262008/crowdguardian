import React, { useState, useEffect } from "react";
import { BrainCircuit, MoveRight, Compass, Shield, ShieldCheck, Zap, AlertTriangle } from "lucide-react";
import { Zone, CrowdPrediction, EvacuationPath } from "../types";

interface PredictiveDashboardProps {
  activeZone: Zone | null;
  onRunPredictiveAnalysis: (zoneId: string) => Promise<any>;
  predictionInsights: {
    predictionSummary: string;
    predictions: any[];
    alternativeEvacuationPaths: any[];
    commandDirectives: string[];
  } | null;
  predictionLoading: boolean;
  zones: Zone[];
}

export default function PredictiveDashboard({
  activeZone,
  onRunPredictiveAnalysis,
  predictionInsights,
  predictionLoading,
  zones
}: PredictiveDashboardProps) {

  const activePred = predictionInsights?.predictions?.find(
    p => p.zoneId?.toLowerCase() === activeZone?.id?.toLowerCase() ||
         p.zoneName?.toLowerCase()?.includes(activeZone?.name?.toLowerCase())
  ) || {
    predictedDensityIn10Mins: Math.min(100, (activeZone?.density || 10) + 12),
    riskLevel: (activeZone?.status === "critical" ? "high" : activeZone?.status === "warning" ? "medium" : "low")
  };

  return (
    <div id="predictive-dashboard-panel" className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-sky-50 p-2 rounded-lg border border-sky-200">
            <BrainCircuit className="h-5 w-5 text-sky-600 animate-pulse" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">A.I. Predictive Intelligence Desk</h2>
            <p className="text-[10px] text-slate-500 font-mono">GEMINI CROWD-SAFETY PROJECTIONS</p>
          </div>
        </div>

        <button
          id="btn-reanalyze-ai"
          onClick={() => activeZone && onRunPredictiveAnalysis(activeZone.id)}
          disabled={predictionLoading || !activeZone}
          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-mono text-[10px] font-bold rounded border border-sky-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {predictionLoading ? (
            <>
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              CALCULATING...
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 fill-white" />
              RUN FORECAST
            </>
          )}
        </button>
      </div>

      {predictionLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-mono animate-pulse">Running Neural Flow Analysis on {activeZone?.name || "Sectors"}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Sub-Column: AI Synthesis & Risks (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-3">
              <h3 className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">Crowd Synthesis & 10M Forecast</h3>
              
              <p className="text-xs text-slate-750 leading-relaxed font-sans">
                {predictionInsights?.predictionSummary || `Active monitoring is selected on ${activeZone?.name || "Sectors"}. General crowd vectors suggest slow buildup with minor cluster groupings forming in the peripheral corridor gates.`}
              </p>

              {/* Projections indicator */}
              <div className="border-t border-slate-200 pt-3 mt-1.5">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5 font-semibold">
                  <span className="text-slate-550">Projected 10-Min Density:</span>
                  <span className={`font-bold ${
                    activePred.riskLevel === "high" ? "text-red-700" : activePred.riskLevel === "medium" ? "text-amber-700" : "text-emerald-700"
                  }`}>{activePred.predictedDensityIn10Mins}%</span>
                </div>
                
                {/* Visual Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300/40">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      activePred.riskLevel === "high" ? "bg-red-500" : activePred.riskLevel === "medium" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${activePred.predictedDensityIn10Mins}%` }}
                  ></div>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] text-slate-550 font-mono mt-2 uppercase font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                  <span>AI projected risk level:</span>
                  <span className={`font-bold ${
                    activePred.riskLevel === "high" ? "text-red-700 animate-pulse" : activePred.riskLevel === "medium" ? "text-amber-700" : "text-emerald-700"
                  }`}>{activePred.riskLevel}</span>
                </div>
              </div>
            </div>

            {/* AI Directives list */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-3">
              <h3 className="text-[10px] text-amber-700 font-mono uppercase tracking-wide flex items-center gap-1.5 font-bold">
                <Shield className="h-3.5 w-3.5 text-amber-700" />
                Commander Operations Directive
              </h3>

              <div className="flex flex-col gap-2.5">
                {(predictionInsights?.commandDirectives || [
                  `Verify exit doors of West Concourse and East Tunnel are completely unobstructed.`,
                  `Instruct PA announcer to stand by for normal visual prompts.`
                ]).map((dir, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-xs text-slate-750 font-sans leading-relaxed">
                    <span className="text-[10px] bg-amber-50 text-amber-750 border border-amber-200 rounded h-4.5 w-4.5 shrink-0 flex items-center justify-center font-mono font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <p>{dir}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sub-Column: Alternative Paths & Ideas (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <h3 className="text-[10px] text-slate-600 font-mono uppercase tracking-wide mb-1 flex items-center gap-1.5 font-bold">
              <Compass className="h-4 w-4 text-sky-600" />
              Dynamic Evacuation Bypasses & Path Capacities
            </h3>

            <div className="flex flex-col gap-3">
              {(predictionInsights?.alternativeEvacuationPaths || [
                {
                  id: "p1",
                  pathName: "West Perimeter Bypass Corridor",
                  fromZone: activeZone?.name || "Main Stage Front",
                  toExit: "Exit C (West Gate Bypass)",
                  currentFlowRate: activeZone?.status === "critical" ? 180 : 35,
                  maxCapacity: 300,
                  status: activeZone?.status === "critical" ? "heavy" : "clear",
                  reasoning: "Utilizes outer service ring around Section 4. Safer alternate bypassing high-pressure Stage front bottle-neck."
                },
                {
                  id: "p2",
                  pathName: "East Stadium Service Arches",
                  fromZone: activeZone?.name || "Main Stage Front",
                  toExit: "Exit D (East Arched Tunnel)",
                  currentFlowRate: activeZone?.status === "critical" ? 120 : 15,
                  maxCapacity: 250,
                  status: "clear",
                  reasoning: "Completely isolated from the Main Stage area. Under-utilized pathway directly venting to external parkway."
                }
              ]).map((path: any) => {
                const isCongested = path.status === "congested" || path.status === "heavy";
                const isBlocked = path.status === "blocked";
                
                let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                if (isCongested) statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                else if (isBlocked) statusColor = "bg-red-50 text-red-700 border-red-200 animate-pulse";

                const flowRatio = Math.round((path.currentFlowRate / path.maxCapacity) * 100);

                return (
                  <div
                    id={`path-card-${path.id}`}
                    key={path.id}
                    className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-350 transition-colors flex flex-col gap-2.5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-sans font-bold text-xs text-slate-800">
                          {path.pathName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-550 font-mono mt-0.5">
                          <span>Origin: {(path.fromZone || "").split(" ")[0] || "Zone"}</span>
                          <MoveRight className="h-3 w-3" />
                          <span className="text-sky-600 font-bold">{path.toExit}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded border ${statusColor}`}>
                        {path.status}
                      </span>
                    </div>

                    {/* Flow details */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1 text-slate-550">
                        <span>Traffic Flow Rate:</span>
                        <span className="text-slate-700 font-bold">{path.currentFlowRate} / {path.maxCapacity} people/min</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full ${isBlocked ? "bg-red-500" : isCongested ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, flowRatio)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* AI reasoning explanation */}
                    <p className="text-[11px] text-slate-600 font-sans italic border-l-2 border-sky-500/45 pl-2 leading-relaxed">
                      {path.reasoning}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
