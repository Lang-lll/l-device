import { logger } from './utils/logger'
import type { PluginInfo, PluginMetadata } from './types/plugins'

export class PluginManager {
  private plugins: Map<string, PluginInfo> = new Map()
  private heartbeatInterval?: NodeJS.Timeout
  private heartbeatCheckInterval: number
  private _onSendHeartbeat?: (metadata: PluginMetadata) => void

  constructor(options?: {
    heartbeatCheckInterval?: number
    onSendHeartbeat?: (metadata: PluginMetadata) => void
  }) {
    const { heartbeatCheckInterval, onSendHeartbeat } = options || {}
    this.heartbeatCheckInterval = heartbeatCheckInterval || 20000
    this._onSendHeartbeat = onSendHeartbeat?.bind(this)
  }

  registerPlugin(metadata: PluginMetadata): boolean {
    /*const existingPlugin = this.plugins.get(metadata.name);

    if (existingPlugin && existingPlugin.status === "connected") {
      logger.info(`插件 ${metadata.name} 已存在，先断开旧连接`);
      this.markDisconnected(metadata.name);
    }*/

    try {
      if (metadata.plugin_name && (metadata.transportUrl || metadata.port)) {
        this.plugins.set(metadata.plugin_name, {
          metadata,
          status: 'connected',
          lastSeen: Date.now(),
          missedHeartbeats: 0,
        })

        logger.info(`插件注册: ${metadata.plugin_name} v${metadata.version}`)
        return true
      }
    } catch (e) {
      logger.error(`插件注册失败: ${metadata}`)
    }

    return false
  }

  getPlugin(name: string) {
    return this.plugins.get(name)
  }

  hasPlugin(name: string) {
    return this.plugins.has(name)
  }

  // 心跳更新
  updateHeartbeat(pluginName: string): boolean {
    logger.debug('接收到插件心跳: ', pluginName)

    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      return false
    }

    plugin.lastSeen = Date.now()
    plugin.missedHeartbeats = 0

    logger.info('updateHeartbeat', pluginName)

    // 如果之前是断开状态，重新连接
    if (plugin.status === 'disconnected') {
      plugin.status = 'connected'
      logger.info(`插件重新连接: ${pluginName}`)
    }

    return true
  }

  // 启动心跳监控
  startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkHealth()
    }, this.heartbeatCheckInterval)
  }

  private checkHealth() {
    const now = Date.now()

    for (const [name, plugin] of this.plugins) {
      const expectedInterval = plugin.metadata.heartbeat_interval || 30000

      if (now - plugin.lastSeen > expectedInterval) {
        plugin.missedHeartbeats++

        if (plugin.missedHeartbeats >= 3) {
          // 连续错过3次心跳
          this.markDisconnected(name)
        } else {
          logger.info(
            `插件 ${name} 心跳延迟，错过 ${plugin.missedHeartbeats} 次`,
          )
        }
      } else {
        this._onSendHeartbeat?.(plugin.metadata)
      }
    }
  }

  private markDisconnected(pluginName: string) {
    const plugin = this.plugins.get(pluginName)
    if (plugin) {
      plugin.status = 'disconnected'
      logger.info(`插件断开: ${pluginName}`)
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
      clearInterval(this.heartbeatInterval)
    }
  }
}
