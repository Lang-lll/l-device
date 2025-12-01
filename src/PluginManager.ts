import type { PluginInfo, PluginMetadata } from "./types/plugins";

export class PluginManager {
  private plugins: Map<string, PluginInfo> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private heartbeatCheckInterval: number = 10000) {}

  registerPlugin(metadata: PluginMetadata): boolean {
    /*const existingPlugin = this.plugins.get(metadata.name);

    if (existingPlugin && existingPlugin.status === "connected") {
      console.log(`⚠️  插件 ${metadata.name} 已存在，先断开旧连接`);
      this.markDisconnected(metadata.name);
    }*/

    this.plugins.set(metadata.plugin_name, {
      metadata,
      status: "connected",
      lastSeen: Date.now(),
      missedHeartbeats: 0,
    });

    console.log(`✅ 插件注册: ${metadata.plugin_name} v${metadata.version}`);
    return true;
  }

  getPlugin(name: string) {
    return this.plugins.get(name);
  }

  hasPlugin(name: string) {
    return this.plugins.has(name);
  }

  // 心跳更新
  updateHeartbeat(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }

    plugin.lastSeen = Date.now();
    plugin.missedHeartbeats = 0;

    // 如果之前是断开状态，重新连接
    if (plugin.status === "disconnected") {
      plugin.status = "connected";
      console.log(`🔌 插件重新连接: ${pluginName}`);
    }

    return true;
  }

  // 启动心跳监控
  startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkHealth();
    }, this.heartbeatCheckInterval);
  }

  private checkHealth() {
    const now = Date.now();

    for (const [name, plugin] of this.plugins) {
      const expectedInterval = plugin.metadata.heartbeat_interval || 30000;

      if (now - plugin.lastSeen > expectedInterval) {
        plugin.missedHeartbeats++;

        if (plugin.missedHeartbeats >= 3) {
          // 连续错过3次心跳
          this.markDisconnected(name);
        } else {
          console.log(
            `⚠️  插件 ${name} 心跳延迟，错过 ${plugin.missedHeartbeats} 次`
          );
        }
      }
    }
  }

  private markDisconnected(pluginName: string) {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.status = "disconnected";
      console.log(`🔌 插件断开: ${pluginName}`);
    }
  }

  // 获取所有插件状态
  /*getPluginsStatus(): PluginStatus[] {
    return Array.from(this.plugins.entries()).map(([name, info]) => ({
      name,
      capabilities: info.metadata.capabilities,
      status: info.status,
      lastSeen: info.lastSeen,
      missedHeartbeats: info.missedHeartbeats
    }));
  }*/

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
