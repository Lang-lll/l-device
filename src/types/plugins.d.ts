export interface PluginLinkInfo {
  _type: "serial" | "http";
  port?: string;
  transportUrl?: string;
}

export interface PluginMethod {
  name: string;
  description: string;
  parameters: PluginParameter[];
  returnType?: PluginParameter;
}

export interface PluginParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
  enum?: string[]; // 枚举值
  defaultValue?: any;
  items?: PluginParameter;
  properties?: PluginParameter;
}

export interface PluginMetadata extends PluginLinkInfo {
  plugin_name: string;
  version: string;
  capabilities: string[];
  methods: PluginMethod[];
  events: string[];
  heartbeat_interval?: number; // 自定义心跳间隔
}

export interface PluginInfo {
  metadata: PluginMetadata;
  status: "connected" | "disconnected" | "error";
  lastSeen: number;
  missedHeartbeats: number;
}

export type PluginMessageData = PluginLinkInfo & Record<string, any>;
export type PluginOnMessageFn = (msg: PluginMessageData) => void;
