import React, { useEffect, useRef, useState } from "react";
import { Map as LucideMap, Satellite, Search, AlertOctagon, HelpCircle, RefreshCw } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Zone } from "../types";

// Standard icon fixing for Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

interface CommandCenterMapProps {
  zones: Zone[];
  activeZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
  alternativePaths?: any[];
}

export default function CommandCenterMap({ zones, activeZone, onSelectZone, alternativePaths = [] }: CommandCenterMapProps) {
  const [activeTab, setActiveTab] = useState<"map" | "blueprint">("blueprint");
  const [mapType, setMapType] = useState<"satellite" | "streets">("satellite");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const heatCirclesGroupRef = useRef<L.LayerGroup | null>(null);
  const evacuationPathsGroupRef = useRef<L.LayerGroup | null>(null);
  const prevZoneIdRef = useRef<string | null>(null);

  // Geographic coordinates for stadium area
  const stadiumCenter: [number, number] = [37.7830, -122.4015];

  // 1. Initialize and Manage Leaflet Map (cached on activeTab)
  useEffect(() => {
    if (activeTab !== "map" || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        heatCirclesGroupRef.current = null;
        evacuationPathsGroupRef.current = null;
      }
      return;
    }

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: stadiumCenter,
      zoom: 16,
      zoomControl: false
    });
    mapInstanceRef.current = map;

    // Add Zoom Control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Group for heat circle overlays
    heatCirclesGroupRef.current = L.layerGroup().addTo(map);

    // Group for evacuation paths
    evacuationPathsGroupRef.current = L.layerGroup().addTo(map);

    // Force map to invalidate size and layout correctly
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        heatCirclesGroupRef.current = null;
        evacuationPathsGroupRef.current = null;
      }
    };
  }, [activeTab]);

  // 1b. Handle Map Tile Layer Switch without destroying map instance
  useEffect(() => {
    if (activeTab !== "map" || !mapInstanceRef.current) return;

    // Remove old tile layer if exists
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const tileUrl = mapType === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const attribution = mapType === "satellite"
      ? "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
      : "&copy; OpenStreetMap contributors";

    tileLayerRef.current = L.tileLayer(tileUrl, { attribution }).addTo(mapInstanceRef.current);
  }, [activeTab, mapType]);

  // 2. Update Map Heat Circles with high-fidelity thermal heatmap gradients on density changes
  useEffect(() => {
    if (activeTab !== "map" || !mapInstanceRef.current || !heatCirclesGroupRef.current) return;

    // Clear old circles
    heatCirclesGroupRef.current.clearLayers();

    // Redraw circles for each zone based on density
    zones.forEach((zone) => {
      const position: [number, number] = [zone.coordinates.lat, zone.coordinates.lng];
      
      // Determine color based on density/status
      const heatColor = zone.status === "critical"
        ? "#ef4444" // red
        : zone.status === "warning"
          ? "#f59e0b" // orange/amber
          : "#10b981"; // green

      // A. Wide ambient outer heat layer (large radius, ultra low opacity)
      const outerHeatCircle = L.circle(position, {
        radius: 60 + (zone.density / 100) * 120,
        fillColor: heatColor,
        fillOpacity: 0.03 + (zone.density / 100) * 0.08,
        color: "transparent",
        interactive: false
      });

      // B. Main dispersion layer (medium radius, moderate opacity)
      const heatCircle = L.circle(position, {
        radius: 35 + (zone.density / 100) * 80, // Dynamic radius spreading
        fillColor: heatColor,
        fillOpacity: 0.12 + (zone.density / 100) * 0.35, // Dynamic opacity
        color: heatColor,
        weight: 1,
        opacity: 0.2,
        dashArray: zone.status === "critical" ? "4, 4" : undefined
      });

      // C. Dense core heat layer (small radius, higher opacity)
      const coreHeatCircle = L.circle(position, {
        radius: 12 + (zone.density / 100) * 32,
        fillColor: heatColor,
        fillOpacity: 0.22 + (zone.density / 100) * 0.45,
        color: "transparent",
        interactive: false
      });

      // Central core center-dot marker
      const coreMarker = L.circleMarker(position, {
        radius: 6,
        fillColor: "#38bdf8", // Cyan core
        fillOpacity: 1,
        color: "#ffffff",
        weight: 2
      });

      // Tooltip
      const popupContent = `
        <div style="font-family: monospace; background-color: #ffffff; color: #1e293b; padding: 5px; border-radius: 4px; font-size: 11px; border: 1px solid ${heatColor}85; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
          <strong style="color: #0284c7; font-size: 12px;">${zone.name}</strong><br/>
          <div style="margin-top: 3px; display: flex; justify-content: space-between; gap: 8px;">
            <span>Density:</span> <strong style="color: ${heatColor};">${zone.density}%</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span>Occupants:</span> <span>${zone.currentCount.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span>Status:</span> <strong style="color: ${heatColor};">${zone.status.toUpperCase()}</strong>
          </div>
        </div>
      `;
      heatCircle.bindTooltip(popupContent, { permanent: false, direction: "top", className: "custom-leaflet-tooltip" });

      // Click to select
      heatCircle.on("click", () => {
        onSelectZone(zone);
      });
      coreMarker.on("click", () => {
        onSelectZone(zone);
      });

      heatCirclesGroupRef.current?.addLayer(outerHeatCircle);
      heatCirclesGroupRef.current?.addLayer(heatCircle);
      heatCirclesGroupRef.current?.addLayer(coreHeatCircle);
      heatCirclesGroupRef.current?.addLayer(coreMarker);
    });
  }, [zones, activeTab]);

  // 2b. Draw dynamic AI-guided alternate evacuation paths on the map
  useEffect(() => {
    if (activeTab !== "map" || !mapInstanceRef.current || !evacuationPathsGroupRef.current) return;

    evacuationPathsGroupRef.current.clearLayers();

    if (!alternativePaths || alternativePaths.length === 0) return;

    alternativePaths.forEach((path: any) => {
      // Locate origin coordinates of matching zone
      const originZone = zones.find(z => z.name === path.fromZone || z.id === activeZone?.id);
      if (!originZone) return;

      const originCoords: [number, number] = [originZone.coordinates.lat, originZone.coordinates.lng];
      
      // Map destination exit gates to absolute coords around stadium
      let exitCoords: [number, number] = [37.7810, -122.4005]; // fallback
      if (path.toExit?.includes("Exit A")) exitCoords = [37.7845, -122.4012];
      else if (path.toExit?.includes("Exit B")) exitCoords = [37.7830, -122.4025];
      else if (path.toExit?.includes("Exit C")) exitCoords = [37.7820, -122.4040];
      else if (path.toExit?.includes("Exit D")) exitCoords = [37.7835, -122.3995];
      else if (path.toExit?.includes("Exit E")) exitCoords = [37.7810, -122.4005];

      // Introduce slightly offset midpoints to curvedly route around the structure
      const midLat = (originCoords[0] + exitCoords[0]) / 2 + (path.id === "path_1" || path.id === "p1" ? -0.0003 : 0.0003);
      const midLng = (originCoords[1] + exitCoords[1]) / 2 + (path.id === "path_1" || path.id === "p1" ? -0.0004 : 0.0004);
      const midCoords: [number, number] = [midLat, midLng];

      const lineCoords = [originCoords, midCoords, exitCoords];

      // Format line styling based on bypass flow status
      const isCongested = path.status === "congested" || path.status === "heavy";
      const isBlocked = path.status === "blocked";
      const pathColor = isBlocked 
        ? "#ef4444" 
        : isCongested 
          ? "#f59e0b" 
          : "#38bdf8"; // cool cyan for clear alternate routes

      const polyline = L.polyline(lineCoords, {
        color: pathColor,
        weight: 3.5,
        opacity: 0.8,
        dashArray: "8, 8",
        lineCap: "round",
        lineJoin: "round"
      });

      // Popup/Tooltip detailing traffic rate and exit designation
      const tooltipContent = `
        <div style="font-family: monospace; background-color: #ffffff; color: #1e293b; padding: 5px; border-radius: 4px; font-size: 10px; border: 1px solid ${pathColor}85; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
          <strong style="color: ${pathColor};">${path.pathName}</strong><br/>
          <div style="margin-top: 3px;">To: <strong style="color: #1e293b;">${path.toExit}</strong></div>
          <div>Flow: <strong>${path.currentFlowRate} / ${path.maxCapacity} P/M</strong></div>
          <div>Status: <strong style="color: ${pathColor}; uppercase">${path.status}</strong></div>
        </div>
      `;
      polyline.bindTooltip(tooltipContent, { sticky: true });

      evacuationPathsGroupRef.current?.addLayer(polyline);
    });
  }, [alternativePaths, zones, activeTab, activeZone]);

  // 3. Pan map to active zone selection ONLY when the zone ID actually changes
  useEffect(() => {
    if (activeTab === "map" && mapInstanceRef.current && activeZone) {
      if (activeZone.id !== prevZoneIdRef.current) {
        mapInstanceRef.current.setView([activeZone.coordinates.lat, activeZone.coordinates.lng], 17);
        prevZoneIdRef.current = activeZone.id;
      }
    } else if (!activeZone) {
      prevZoneIdRef.current = null;
    }
  }, [activeZone, activeTab]);

  // 4. Handle Nominatim geocoding search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || activeTab !== "map" || !mapInstanceRef.current) return;

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const results = await response.json();

      if (results && results.length > 0) {
        const bestResult = results[0];
        const lat = parseFloat(bestResult.lat);
        const lon = parseFloat(bestResult.lon);
        
        mapInstanceRef.current.flyTo([lat, lon], 16, {
          animate: true,
          duration: 1.5
        });

        // Add a temporary search highlight marker
        const searchMarker = L.marker([lat, lon]).addTo(mapInstanceRef.current);
        searchMarker.bindPopup(`<b>Search Location</b><br/>${bestResult.display_name}`).openPopup();
      } else {
        setSearchError("No results found. Try another query.");
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
      setSearchError("Search service unavailable.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div id="visualizer-desk" className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      {/* Visualizer Desk Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <LucideMap className="h-5 w-5 text-sky-600 font-bold" />
          <div>
            <h2 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Visualizer Terminal</h2>
            <p className="text-[10px] text-slate-500 font-mono">HEATMAP & SECURE Blueprint OVERLAYS</p>
          </div>
        </div>

        {/* Tab Switchers styled like design HTML map buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            id="tab-btn-blueprint"
            onClick={() => setActiveTab("blueprint")}
            className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              activeTab === "blueprint"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            VENUE BLUEPRINT
          </button>
          <button
            id="tab-btn-map"
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              activeTab === "map"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SATELLITE & MAP
          </button>
        </div>
      </div>

      {/* Blueprint Mode Visuals */}
      {activeTab === "blueprint" && (
        <div className="flex-1 relative bg-slate-50 min-h-[380px] flex items-center justify-center p-6 select-none overflow-hidden border-b border-slate-200">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>

          {/* Stadium SVG Vector Layout */}
          <svg className="w-full max-w-[500px] h-auto aspect-square relative z-10" viewBox="0 0 100 100">
            {/* Outer Perimeter Wall */}
            <rect x="5" y="5" width="90" height="90" rx="15" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3,3" />
            
            {/* Main Stadium Outer Oval */}
            <ellipse cx="50" cy="50" rx="38" ry="38" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
            
            {/* Outer Ring seating corridor */}
            <ellipse cx="50" cy="50" rx="32" ry="32" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            
            {/* Inner Pitch Border */}
            <ellipse cx="50" cy="50" rx="22" ry="22" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.5" />

            {/* EXIT indicators */}
            <g fontClassName="font-mono" fontSize="2.5" fill="#64748b" fontWeight="bold">
              <text x="50" y="3" textAnchor="middle">EXIT A (NORTH)</text>
              <text x="3" y="51" textAnchor="start">EXIT C (WEST)</text>
              <text x="97" y="51" textAnchor="end">EXIT D (EAST)</text>
              <text x="50" y="98" textAnchor="middle">EXIT E (SOUTH)</text>
            </g>

            {/* Stadium Stage Layout */}
            <g transform="translate(35, 10)">
              <rect x="0" y="0" width="30" height="8" rx="1" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1" />
              <text x="15" y="5" fill="#0284c7" fontSize="3" fontFamily="monospace" textAnchor="middle" fontWeight="bold">MAIN PERFORMING STAGE</text>
            </g>

            {/* Connection Flow Vector lines (Evacuation Paths) */}
            <g stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="2, 2" opacity="0.6" fill="none">
              <path d="M 50,15 L 50,50" /> {/* North to Center */}
              <path d="M 20,50 L 50,50" /> {/* West to Center */}
              <path d="M 80,50 L 50,50" /> {/* East to Center */}
              <path d="M 50,85 L 50,50" /> {/* South to Center */}
            </g>

            {/* Pulse Radar Rings & Interactive Zone Spots */}
            {zones.map((zone) => {
              const active = zone.status === "critical";
              const warning = zone.status === "warning";
              
              let markerColor = "#16a34a"; // Safe
              if (active) markerColor = "#dc2626"; // Critical
              else if (warning) markerColor = "#d97706"; // Warning

              return (
                <g key={zone.id} className="cursor-pointer group" onClick={() => onSelectZone(zone)}>
                  {/* Pulsing radar circles for critical zones */}
                  {active && (
                    <>
                      <circle cx={zone.svgPos.x} cy={zone.svgPos.y} r="12" fill="none" stroke="#dc2626" strokeWidth="0.7">
                        <animate attributeName="r" values="3;15" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={zone.svgPos.x} cy={zone.svgPos.y} r="8" fill="none" stroke="#dc2626" strokeWidth="0.4">
                        <animate attributeName="r" values="2;10" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}

                  {/* Pulsing radar for warning zones (slower, orange) */}
                  {warning && (
                    <circle cx={zone.svgPos.x} cy={zone.svgPos.y} r="10" fill="none" stroke="#d97706" strokeWidth="0.5" opacity="0.6">
                      <animate attributeName="r" values="3;10" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Intersecting heat spread ellipse overlay */}
                  <ellipse
                    cx={zone.svgPos.x}
                    cy={zone.svgPos.y}
                    rx={4 + (zone.density / 100) * 8}
                    ry={4 + (zone.density / 100) * 8}
                    fill={markerColor}
                    fillOpacity={0.12 + (zone.density / 100) * 0.25}
                    stroke={markerColor}
                    strokeWidth="0.3"
                    className="transition-all duration-500"
                  />

                  {/* Interactive central core node */}
                  <circle
                    cx={zone.svgPos.x}
                    cy={zone.svgPos.y}
                    r={activeZone?.id === zone.id ? "2" : "1.2"}
                    fill={activeZone?.id === zone.id ? "#0284c7" : "#ffffff"}
                    stroke={markerColor}
                    strokeWidth="0.6"
                    className="transition-all"
                  />

                  {/* Zone text label */}
                  <rect
                    x={zone.svgPos.x - 14}
                    y={zone.svgPos.y + 4}
                    width="28"
                    height="5.5"
                    rx="1"
                    fill="#ffffff"
                    fillOpacity="0.95"
                    stroke={activeZone?.id === zone.id ? "#0284c7" : "#cbd5e1"}
                    strokeWidth="0.4"
                  />
                  <text
                    x={zone.svgPos.x}
                    y={zone.svgPos.y + 8}
                    fill={activeZone?.id === zone.id ? "#0284c7" : "#1e293b"}
                    fontSize="2.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {zone.id.toUpperCase()}: {zone.density}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick HUD Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 border border-slate-200 p-2.5 rounded font-mono text-[9px] text-slate-600 shadow-sm z-20 flex flex-col gap-1.5">
            <div className="text-[10px] font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1 uppercase">Sectors Status</div>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              <span>SAFE (&lt;60%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>ELEVATED (&gt;60%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
              <span>CRITICAL (&gt;85%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Mode Visuals */}
      {activeTab === "map" && (
        <div className="flex-1 relative min-h-[380px] flex flex-col bg-slate-50">
          {/* Map Geocoder Search Bar */}
          <form
            onSubmit={handleSearch}
            className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-1.5 bg-white border border-slate-200 p-2 rounded shadow-sm"
          >
            <Search className="h-4 w-4 text-slate-400 ml-1.5" />
            <input
              id="map-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search world coordinates or stadium places..."
              className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400 font-mono"
            />
            {isSearching ? (
              <RefreshCw className="h-3.5 w-3.5 text-sky-600 animate-spin mr-1" />
            ) : (
              <button
                id="btn-map-search-submit"
                type="submit"
                className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-mono font-bold rounded transition-colors cursor-pointer"
              >
                GO
              </button>
            )}
          </form>

          {/* Map Layer Switchers (Absolute overlay) */}
          <div className="absolute top-16 left-4 z-[1000] flex flex-col gap-1">
            <button
              id="btn-layer-satellite"
              onClick={() => setMapType("satellite")}
              className={`p-2 rounded border shadow-sm transition-colors flex items-center gap-1.5 font-mono text-[9px] font-bold ${
                mapType === "satellite"
                  ? "bg-sky-600 text-white border-sky-700"
                  : "bg-white/90 text-slate-650 border-slate-250 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Satellite className="h-3 w-3" />
              SATELLITE
            </button>
            <button
              id="btn-layer-streets"
              onClick={() => setMapType("streets")}
              className={`p-2 rounded border shadow-sm transition-colors flex items-center gap-1.5 font-mono text-[9px] font-bold ${
                mapType === "streets"
                  ? "bg-sky-600 text-white border-sky-700"
                  : "bg-white/90 text-slate-650 border-slate-250 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <LucideMap className="h-3 w-3" />
              STREET MAP
            </button>
          </div>

          {searchError && (
            <div className="absolute top-16 right-4 z-[1000] bg-red-50 border border-red-200 text-red-800 px-2 py-1 rounded text-[10px] font-mono shadow-sm">
              {searchError}
            </div>
          )}

          {/* Leaflet container */}
          <div
            id="leaflet-map-element"
            ref={mapContainerRef}
            className="w-full h-full min-h-[380px] flex-1"
          />
        </div>
      )}
    </div>
  );
}
