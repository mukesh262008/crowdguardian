export interface Zone {
  id: string;
  name: string;
  capacity: number;
  currentCount: number;
  density: number; // Percentage (0 - 100)
  status: 'safe' | 'warning' | 'critical';
  sparkline: number[]; // Array of recent density readings
  coordinates: {
    lat: number;
    lng: number;
  };
  svgPos: {
    x: number; // Percent on SVG venue blueprint (0 - 100)
    y: number; // Percent on SVG venue blueprint (0 - 100)
  };
  nearestExit: string;
}

export type DispatchLogType = 'sms' | 'voice' | 'alert' | 'police_dispatch' | 'command_broadcast';

export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  zoneId: string;
  zoneName: string;
  type: DispatchLogType;
  recipient: string;
  message: string;
  status: 'sent' | 'calling' | 'completed' | 'failed';
  sid: string;
}

export interface CrowdPrediction {
  zoneId: string;
  zoneName: string;
  currentDensity: number;
  predictedDensityIn10Mins: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: string;
}

export interface EvacuationPath {
  id: string;
  pathName: string;
  fromZone: string;
  toExit: string;
  currentFlowRate: number; // people/min
  maxCapacity: number;     // people/min
  status: 'clear' | 'heavy' | 'congested' | 'blocked';
  waypoints: [number, number][]; // Lat, Lng path coordinates
}
