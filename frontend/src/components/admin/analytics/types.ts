export type TimeframeRange = '24h' | '7d' | '30d' | 'all' | 'custom';

export interface FleetOverviewData {
  totalAgents: number;
  serviceAgents: number;
  productAgents: number;
  totalAiBalance: number;
  totalCredits: number;
  lowBalanceCount: number;
  criticalBalanceCount: number;
  activeWhatsAppCount: number;
  configuredWhatsAppCount: number;
}

export interface ThroughputDataPoint {
  label: string;
  count: number;
  hour?: string;
}

export interface MessageTelemetryData {
  totalMessages: number;
  messagesInPeriod: number;
  messagesToday: number;
  inboundMessages: number;
  outboundMessages: number;
  peakRate: number; // msg/s
  hourlyThroughput: ThroughputDataPoint[];
}

export interface TokenTrendDataPoint {
  label: string;
  tokens: number; // in Millions
  month?: string;
}

export interface AiTelemetryData {
  totalTokens: number;
  tokensInPeriod: number;
  quotaUtilizationPercent: number;
  monthlyTokensHistory: TokenTrendDataPoint[];
  avgTokensPerTurn: number;
  engineLatencyMs: number;
  uptimePercent: number;
}

export interface TopAgentRecord {
  id: string;
  user_name: string;
  user_email: string;
  agent_prefix: string;
  business_type: 'product' | 'service';
  ai_balance: number;
  credits: number;
  whatsapp_active: boolean;
  created_at: string;
  last_login_at?: string | null;
  total_customers?: number;
  total_conversations?: number;
}

export interface SystemAnalyticsPayload {
  timeframe: TimeframeRange;
  fleetOverview: FleetOverviewData;
  messageTelemetry: MessageTelemetryData;
  aiTelemetry: AiTelemetryData;
  topAgents: TopAgentRecord[];
}
