export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertType =
  | 'proximity'
  | 'speed'
  | 'area_entry'
  | 'area_exit'
  | 'idle_time'
  | 'unauthorized_access'
  | 'equipment_usage'
  | 'safety_zone'
  | 'crowd_density'
  | 'ppe_detection';

export interface AlertRule {
  id?: string;
  name: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: {
    [key: string]: any;
  };
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  location?: {
    x: number;
    y: number;
  };
  metadata?: {
    [key: string]: any;
  };
  status: 'active' | 'acknowledged' | 'resolved';
} 