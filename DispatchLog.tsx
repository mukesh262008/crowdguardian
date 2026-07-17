import React, { useState } from "react";
import { MessageSquare, Phone, ShieldAlert, Users, Send, CheckCircle2, XCircle, Info, Radio, Compass, Video } from "lucide-react";
import { DispatchLogEntry, Zone } from "../types";

interface DispatchLogProps {
  logs: DispatchLogEntry[];
  zones: Zone[];
  activeZone: Zone | null;
  onSendAlert: (payload: {
    zoneId: string;
    density: number;
    recipientNumber: string;
    customMessage: string;
    isVictim: boolean;
  }) => Promise<void>;
  onPostPoliceCommand: (command: string, units: string) => Promise<void>;
  onRunDroneDetection: (
    zoneId: string,
    count: number,
    droneId: string,
    altitude: number,
    battery: number
  ) => Promise<void>;
  isSending: boolean;
  apiError: string;
  apiSuccessSid: string;
}

export default function DispatchLog({
  logs,
  zones,
  activeZone,
  onSendAlert,
  onPostPoliceCommand,
  onRunDroneDetection,
  isSending,
  apiError,
  apiSuccessSid
}: DispatchLogProps) {
  // Manual Dispatch State
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [recipientNumber, setRecipientNumber] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isVictimAlert, setIsVictimAlert] = useState(false);

  // Drone Overwatch State
  const [selectedDroneId, setSelectedDroneId] = useState("DRN-Sentinel-09");
  const [droneAltitude, setDroneAltitude] = useState(150);
  const [droneBattery, setDroneBattery] = useState(94);
  const [droneTargetZoneId, setDroneTargetZoneId] = useState("");
  const [droneCrowdCount, setDroneCrowdCount] = useState("");
  const [droneScanning, setDroneScanning] = useState(false);

  // Police Command State
  const [policeCommand, setPoliceCommand] = useState("");
  const [targetUnits, setTargetUnits] = useState("Sect Unit Delta");

  // Form submits
  const handleManualDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback to active zone or first zone
    const targetId = selectedZoneId || activeZone?.id || zones[0]?.id;
    const targetZone = zones.find(z => z.id === targetId);
    if (!targetZone) return;

    onSendAlert({
      zoneId: targetZone.id,
      density: targetZone.density,
      recipientNumber: recipientNumber,
      customMessage: customMessage,
      isVictim: isVictimAlert
    });

    // Clear message input on success
    setCustomMessage("");
  };

  const handleDroneScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = droneTargetZoneId || activeZone?.id || zones[0]?.id;
    const targetZone = zones.find(z => z.id === targetId);
    if (!targetZone) return;

    let count = parseInt(droneCrowdCount);
    if (isNaN(count)) {
      // default: simulate high critical surge to trigger automated SMS alerts
      count = Math.round(targetZone.capacity * 0.91);
    }

    setDroneScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    await onRunDroneDetection(
      targetId,
      count,
      selectedDroneId,
      droneAltitude,
      droneBattery
    );

    setDroneCrowdCount("");
    setDroneScanning(false);
  };

  const handlePoliceCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policeCommand.trim()) return;

    onPostPoliceCommand(policeCommand, targetUnits);
    setPoliceCommand("");
  };

  return (
    <div id="dispatch-console" className="flex flex-col gap-5 h-full">
      {/* 1. Tactical Command Overrides Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="font-sans font-bold text-xs text-sky-700 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2.5 mb-3">
          <Radio className="h-4 w-4 text-sky-600 animate-pulse" />
          Tactical Dispatch Override
        </h2>

        <form onSubmit={handleManualDispatchSubmit} className="flex flex-col gap-3">
          {/* Target Zone Selection */}
          <div>
            <label className="block text-[10px] text-slate-500 font-mono mb-1">TARGET MONITORING ZONE</label>
            <select
              id="dispatch-zone-select"
              value={selectedZoneId || activeZone?.id || ""}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="" disabled>-- Select Zone --</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.id.toUpperCase()}: {zone.name} ({zone.density}% Density)
                </option>
              ))}
            </select>
          </div>

          {/* Alert Target Toggle */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 font-mono font-semibold">TARGET AUDIENCE</span>
            <div className="flex items-center gap-2">
              <button
                id="btn-target-responder"
                type="button"
                onClick={() => setIsVictimAlert(false)}
                className={`px-2 py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                  !isVictimAlert
                    ? "bg-sky-600 text-white border-sky-700"
                    : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                }`}
              >
                RESPONDER
              </button>
              <button
                id="btn-target-victim"
                type="button"
                onClick={() => setIsVictimAlert(true)}
                className={`px-2 py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer border ${
                  isVictimAlert
                    ? "bg-red-600 text-white border-red-700"
                    : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                }`}
              >
                VICTIM
              </button>
            </div>
          </div>

          {/* Recipient Phone Number */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] text-slate-500 font-mono">RECIPIENT NUMBER</label>
              <span className="text-[8px] text-slate-500 font-mono">E.164 (eg +15550199)</span>
            </div>
            <input
              id="recipient-number-input"
              type="text"
              value={recipientNumber}
              onChange={(e) => setRecipientNumber(e.target.value)}
              placeholder="Defaults to Twilio Verified Secret number..."
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Custom Message Body */}
          <div>
            <label className="block text-[10px] text-slate-500 font-mono mb-1">CUSTOM DISPATCH MESSAGE (OPTIONAL)</label>
            <textarea
              id="custom-message-input"
              rows={2}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={isVictimAlert ? "Direct instructions to trapped victims. E.g. 'Move calmly towards West Gate bypass corridor...'" : "Direct directives to response units..."}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-sky-500 font-sans resize-none"
            />
          </div>

          {/* Twilio Feedback Banner */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800 text-[10px] font-mono flex items-start gap-1.5 shadow-sm">
              <Info className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Twilio Notice: </span>
                {apiError}
              </div>
            </div>
          )}

          {apiSuccessSid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-800 text-[10px] font-mono flex items-start gap-1.5 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Dispatch Success! </span>
                Sid logged: <span className="underline">{apiSuccessSid}</span>
              </div>
            </div>
          )}

          {/* Submit Trigger */}
          <button
            id="btn-trigger-manual-dispatch"
            type="submit"
            disabled={isSending}
            className={`w-full py-2 text-xs font-mono font-bold uppercase rounded border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isSending
                ? "bg-slate-100 border-slate-200 text-slate-450 cursor-not-allowed"
                : isVictimAlert
                  ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                  : "bg-sky-600 hover:bg-sky-700 text-white border-sky-700"
            }`}
          >
            {isVictimAlert ? (
              <>
                <MessageSquare className="h-4 w-4" />
                SEND VICTIM SMS ALERT
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4" />
                DISPATCH SECURITY TEST ALERT
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. Drone Overwatch Controls Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="font-sans font-bold text-xs text-cyan-750 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2.5 mb-3">
          <Compass className="h-4 w-4 text-cyan-600 animate-spin" style={{ animationDuration: "12s" }} />
          Drone Overwatch Terminal
        </h2>

        <form onSubmit={handleDroneScanSubmit} className="flex flex-col gap-3">
          {/* Target Zone Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] text-slate-500 font-mono mb-1">TARGET AREA</label>
              <select
                id="drone-zone-select"
                value={droneTargetZoneId || activeZone?.id || ""}
                onChange={(e) => setDroneTargetZoneId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded p-1.5 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.id.toUpperCase()}: {zone.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-slate-500 font-mono mb-1">ACTIVE DRONE</label>
              <select
                id="drone-select"
                value={selectedDroneId}
                onChange={(e) => setSelectedDroneId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-[11px] rounded p-1.5 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="DRN-Sentinel-09">DRN-Sentinel-09</option>
                <option value="DRN-Thermal-A">DRN-Thermal-A</option>
                <option value="DRN-Overwatch-5">DRN-Overwatch-5</option>
                <option value="DRN-HeliCam-X">DRN-HeliCam-X</option>
              </select>
            </div>
          </div>

          {/* Altitude & Battery parameters */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] font-mono">
            <div className="flex flex-col gap-1">
              <span className="text-slate-550">ALTITUDE: <span className="text-cyan-700 font-bold">{droneAltitude}ft</span></span>
              <input
                type="range"
                min="50"
                max="400"
                step="10"
                value={droneAltitude}
                onChange={(e) => setDroneAltitude(parseInt(e.target.value))}
                className="w-full accent-cyan-600 h-1 rounded"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-550">BATTERY: <span className="text-cyan-700 font-bold">{droneBattery}%</span></span>
              <input
                type="range"
                min="10"
                max="100"
                value={droneBattery}
                onChange={(e) => setDroneBattery(parseInt(e.target.value))}
                className="w-full accent-cyan-600 h-1 rounded"
              />
            </div>
          </div>

          {/* Drone Count Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[9px] text-slate-500 font-mono">DRONE COUNT INPUT</label>
              <span className="text-[8px] text-slate-500 font-mono">Leave empty for auto-surge (91%)</span>
            </div>
            <div className="flex gap-2">
              <input
                id="drone-count-input"
                type="number"
                value={droneCrowdCount}
                onChange={(e) => setDroneCrowdCount(e.target.value)}
                placeholder="E.g. 2500"
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                id="btn-drone-execute"
                type="submit"
                disabled={droneScanning}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono font-bold text-xs rounded border border-cyan-700 hover:border-cyan-800 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {droneScanning ? (
                  <span className="animate-pulse">SCANNING...</span>
                ) : (
                  <>
                    <Video className="h-3.5 w-3.5" />
                    RUN SCAN
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Direct Police Broadcast terminal */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="font-sans font-bold text-xs text-amber-700 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-200 pb-2.5 mb-3">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          Police Dispatch Center
        </h2>

        <form onSubmit={handlePoliceCommandSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-slate-500 font-mono mb-1">TACT UNIT</label>
              <select
                id="police-unit-select"
                value={targetUnits}
                onChange={(e) => setTargetUnits(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="Sect Unit Delta">Sect Unit Delta</option>
                <option value="Tact Command Charlie">Tact Command Charlie</option>
                <option value="Paramedic Strike A">Paramedic Strike A</option>
                <option value="All Ground Responders">All Responders</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              id="police-command-input"
              type="text"
              value={policeCommand}
              onChange={(e) => setPoliceCommand(e.target.value)}
              placeholder="Type radio directive to dispatch..."
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded p-2 pr-9 focus:outline-none focus:border-amber-500"
            />
            <button
              id="btn-police-command-submit"
              type="submit"
              className="absolute right-1.5 top-1.5 p-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
              title="Broadcast directive"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>

      {/* 3. Live Dispatch & Event Log Ticker */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex-1 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
        <h2 className="font-sans font-bold text-xs text-slate-800 tracking-wider uppercase border-b border-slate-200 pb-2.5 mb-3 flex items-center justify-between">
          <span>Live Activity Feed</span>
          <span className="text-[9px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{logs.length} EVENTS</span>
        </h2>

        {/* Scrollable logs list */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-slate-300">
          {logs.map((log) => {
            // Determine icons and status colors
            const isSms = log.type === "sms";
            const isVoice = log.type === "voice";
            const isPolice = log.type === "police_dispatch";
            const isAlert = log.type === "alert";

            let icon = <Info className="h-3.5 w-3.5 text-sky-600" />;
            if (isSms) icon = <MessageSquare className="h-3.5 w-3.5 text-sky-600" />;
            else if (isVoice) icon = <Phone className="h-3.5 w-3.5 text-fuchsia-600" />;
            else if (isPolice) icon = <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />;
            else if (isAlert) icon = <ShieldAlert className="h-3.5 w-3.5 text-red-600" />;

            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

            return (
              <div
                id={`log-item-${log.id}`}
                key={log.id}
                className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-col gap-1 hover:border-slate-300 transition-colors shadow-sm"
              >
                {/* Log Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-[10px] text-slate-700 font-mono font-bold uppercase">
                      {log.type.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">{timeStr}</span>
                </div>

                {/* Log Message */}
                <p className="text-xs text-slate-600 font-sans leading-relaxed break-words font-medium">
                  {log.message}
                </p>

                {/* Log Footer status */}
                <div className="flex items-center justify-between border-t border-slate-200 pt-1 mt-1 font-mono text-[8px] text-slate-500">
                  <span>To: {log.recipient}</span>
                  <span className="flex items-center gap-1">
                    {log.status === "completed" || log.status === "sent" ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-bold text-[7.5px]">DELIVERED</span>
                    ) : log.status === "failed" ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 uppercase font-bold text-[7.5px]">FAILED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase font-bold text-[7.5px] animate-pulse">QUEUED</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
