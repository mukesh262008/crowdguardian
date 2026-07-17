/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { ShieldAlert, Play, Pause, RotateCcw, AlertTriangle, Eye, Shield, Radio, Activity } from "lucide-react";
import { Zone, DispatchLogEntry } from "./types";
import TopAlertBanner from "./components/TopAlertBanner";
import ZoneCards from "./components/ZoneCards";
import CommandCenterMap from "./components/CommandCenterMap";
import DispatchLog from "./components/DispatchLog";
import PredictiveDashboard from "./components/PredictiveDashboard";

export default function App() {
  // Live Telemetry States
  const [zones, setZones] = useState<Zone[]>([]);
  const [logs, setLogs] = useState<DispatchLogEntry[]>([]);
  const [simulation, setSimulation] = useState({
    timeSeconds: 0,
    formattedTime: "0m 0s",
    running: false,
    phase: "Gates Open"
  });

  // Selected details
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // Lifted Prediction States
  const [predictionInsights, setPredictionInsights] = useState<{
    predictionSummary: string;
    predictions: any[];
    alternativeEvacuationPaths: any[];
    commandDirectives: string[];
  } | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Twilio Call State feedback
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiSuccessSid, setApiSuccessSid] = useState("");

  // Auto-trigger predictive analysis when active zone selection changes
  useEffect(() => {
    if (selectedZone) {
      runPredictiveAnalysis(selectedZone.id);
    }
  }, [selectedZone?.id]);

  // 1. Core State Poller (Fed by custom backend datastore)
  const fetchState = async () => {
    try {
      const response = await fetch("/api/state");
      if (!response.ok) throw new Error("Connection failed");
      const data = await response.json();
      
      setZones(data.zones);
      setLogs(data.dispatchLogs);
      setSimulation(data.simulation);

      // Keep active selection reference synced with live counts
      if (selectedZone) {
        const updated = data.zones.find((z: Zone) => z.id === selectedZone.id);
        if (updated) setSelectedZone(updated);
      } else if (data.zones.length > 0) {
        setSelectedZone(data.zones[1]); // default to Main Stage
      }
    } catch (err) {
      console.error("Telemetry server polling error:", err);
    }
  };

  useEffect(() => {
    fetchState();
    // Poll every 1.5 seconds
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [selectedZone]);

  // 2. Control room directives
  const toggleSimulation = async () => {
    try {
      const res = await fetch("/api/simulation/toggle", { method: "POST" });
      const data = await res.json();
      setSimulation(prev => ({ ...prev, running: data.running }));
    } catch (e) {
      console.error("Failed to toggle simulation:", e);
    }
  };

  const resetSimulation = async () => {
    try {
      await fetch("/api/simulation/reset", { method: "POST" });
      fetchState();
    } catch (e) {
      console.error("Failed to reset simulation:", e);
    }
  };

  const triggerSurge = async () => {
    try {
      await fetch("/api/simulate-surge", { method: "POST" });
      fetchState();
    } catch (e) {
      console.error("Failed to trigger surge simulation:", e);
    }
  };

  const runYoloDetection = async (zoneId: string, count: number) => {
    try {
      const response = await fetch("/api/yolo-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId, count })
      });
      if (response.ok) fetchState();
    } catch (e) {
      console.error("YOLO counting backend push error:", e);
    }
  };

  const runDroneDetection = async (zoneId: string, count: number, droneId: string, altitude: number, battery: number) => {
    try {
      const response = await fetch("/api/drone-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId, count, droneId, altitude, battery })
      });
      if (response.ok) fetchState();
    } catch (e) {
      console.error("Drone counting backend push error:", e);
    }
  };

  const sendAlert = async (payload: {
    zoneId: string;
    density: number;
    recipientNumber: string;
    customMessage: string;
    isVictim: boolean;
  }) => {
    setIsSending(true);
    setApiError("");
    setApiSuccessSid("");

    try {
      const response = await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        setApiSuccessSid(data.smsSid);
        fetchState();
      } else {
        setApiError(data.error || "Twilio gateway failed to route alert.");
      }
    } catch (err: any) {
      setApiError("Network failure connecting to emergency dispatch gateway.");
    } finally {
      setIsSending(false);
    }
  };

  const postPoliceCommand = async (command: string, units: string) => {
    try {
      const response = await fetch("/api/police-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, units })
      });
      if (response.ok) fetchState();
    } catch (e) {
      console.error("Failed to publish police directive:", e);
    }
  };

  const runPredictiveAnalysis = async (zoneId: string) => {
    setPredictionLoading(true);
    try {
      const response = await fetch("/api/predictive-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeZoneId: zoneId })
      });
      const data = await response.json();
      setPredictionInsights(data);
      return data;
    } catch (e) {
      console.error("Prediction endpoint connection error:", e);
      throw e;
    } finally {
      setPredictionLoading(false);
    }
  };

  // Find if any zone is currently critical to display warning banner
  const criticalZone = zones.find(z => z.status === "critical") || null;

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-500/30 selection:text-slate-900">
      
      {/* Dynamic Top Crisis Banner */}
      <TopAlertBanner
        criticalZone={criticalZone}
        onDispatchAlert={(zone) => {
          sendAlert({
            zoneId: zone.id,
            density: zone.density,
            recipientNumber: "",
            customMessage: "",
            isVictim: false
          });
        }}
      />

      {/* Main HUD Nav Header */}
      <header id="main-header" className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 relative z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded border border-sky-200">
              <Shield className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-slate-800 flex items-center gap-2">
                CROWD<span className="text-sky-600">GUARDIAN</span> AI
                <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                  PROTOTYPE
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Real-time Response Command</p>
            </div>
          </div>

          {/* System status + Wembley Node indicators from Design HTML */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(22,163,74,0.4)]"></span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 animate-pulse">SYSTEM OPTIMAL</span>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono text-slate-800 uppercase tracking-wider font-bold">Wembley Stadium Node</div>
              <div className="text-[9px] text-slate-500 font-mono">ACTIVE TELEMETRY STATION</div>
            </div>
          </div>

          {/* Core Simulation Clock and Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded border border-slate-200 shadow-sm">
            {/* Clock Telemetry */}
            <div className="px-3 py-1 border-r border-slate-200 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
              <div>
                <span className="text-[8px] block text-slate-500 font-mono leading-none font-bold">TIME ELAPSED</span>
                <span className="text-sm font-mono font-bold text-slate-850">{simulation.formattedTime}</span>
              </div>
            </div>

            {/* Stage Phase */}
            <div className="px-3 py-1 border-r border-slate-200">
              <span className="text-[8px] block text-slate-500 font-mono leading-none font-bold">STADIUM PHASE</span>
              <span className="text-xs font-mono font-bold text-sky-700 uppercase">{simulation.phase}</span>
            </div>

            {/* Playback Buttons */}
            <div className="flex items-center gap-1.5 pl-1.5">
              <button
                id="btn-toggle-sim"
                onClick={toggleSimulation}
                className={`p-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  simulation.running
                    ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-250"
                    : "bg-sky-600 text-white hover:bg-sky-700 border border-sky-700"
                }`}
                title={simulation.running ? "Pause timeline flow" : "Start timeline flow"}
              >
                {simulation.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                <span className="text-[10px] hidden sm:inline">{simulation.running ? "PAUSE" : "PLAY"}</span>
              </button>

              <button
                id="btn-reset-sim"
                onClick={resetSimulation}
                className="p-1.5 bg-white hover:bg-slate-100 text-slate-650 border border-slate-250 rounded transition-colors cursor-pointer"
                title="Reset simulation to 0m 0s"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                id="btn-trigger-surge"
                onClick={triggerSurge}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-mono font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1"
                title="Inject instant extreme crowd surge spike to Front of Main Stage"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                SIMULATE SURGE
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace Dashboard */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Zone Density cards (4 columns) */}
        <section className="lg:col-span-4 h-full">
          <ZoneCards
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={(zone) => setSelectedZone(zone)}
            onRunYoloDetection={runYoloDetection}
          />
        </section>

        {/* Center Column: Heatmap/Blueprint visualizer + Predictive AI panels (5 columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6 h-full">
          
          {/* Big Map Layer Visualizers */}
          <div className="flex-1 min-h-[380px]">
            <CommandCenterMap
              zones={zones}
              activeZone={selectedZone}
              onSelectZone={(zone) => setSelectedZone(zone)}
              alternativePaths={predictionInsights?.alternativeEvacuationPaths || []}
            />
          </div>

          {/* AI Projections Panel */}
          <PredictiveDashboard
            activeZone={selectedZone}
            onRunPredictiveAnalysis={runPredictiveAnalysis}
            predictionInsights={predictionInsights}
            predictionLoading={predictionLoading}
            zones={zones}
          />
        </section>

        {/* Right Column: SMS/Voice Logs + Police direct dispatcher (3 columns) */}
        <section className="lg:col-span-3 h-full">
          <DispatchLog
            logs={logs}
            zones={zones}
            activeZone={selectedZone}
            onSendAlert={sendAlert}
            onPostPoliceCommand={postPoliceCommand}
            onRunDroneDetection={runDroneDetection}
            isSending={isSending}
            apiError={apiError}
            apiSuccessSid={apiSuccessSid}
          />
        </section>
      </main>

      {/* Footer System Credits */}
      <footer id="main-footer" className="border-t border-slate-200 bg-white py-3.5 px-6 mt-8 font-mono text-[9px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-sky-600" />
          <span>REALTIME YOLO DETECT: SECURE CORRIDORS SECURED</span>
        </div>
        <div>
          <span>CROWDGUARDIAN COMMAND PLATFORM &copy; 2026. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>
    </div>
  );
}
