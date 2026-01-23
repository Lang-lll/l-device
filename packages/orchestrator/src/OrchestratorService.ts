import { TransportManager } from './transport/TransportManager'
import { PluginManager } from './PluginManager'
import { logger } from './utils/logger'

export class OrchestratorService {
  transportManager: TransportManager
  pluginManager: PluginManager
  constructor() {
    this.transportManager = new TransportManager({
      onMessage: (msg) => {
        this.handlePluginMessage(msg)
      },
    })
    this.pluginManager = new PluginManager({
      onSendHeartbeat: (metadata) => {
        this.transportManager.send(metadata, { type: 'heartbeat' })
      },
    })
  }

  // 处理来自设备的消息
  private handlePluginMessage(data: Record<string, any>) {
    logger.debug('接收到消息: ', data)

    try {
      switch (data.type) {
        case 'register':
          const plugin_name = data.message.plugin_name
          const result = this.pluginManager.registerPlugin(data.message)

          if (result) {
            this.routeMessage([plugin_name], { type: 'registered' })
          } else {
            logger.error('插件注册失败: ', data.message)
          }
          break
        case 'publish':
          this.routeMessage(data.to_plugin, data.message)
          break
        case 'heartbeat':
          this.pluginManager.updateHeartbeat(data.plugin_name)
          break
        default:
          break
      }
    } catch (error) {
      logger.error('消息解析错误:', error)
    }
  }

  // 路由消息到指定插件
  private routeMessage(to_plugin: string[], message: Record<string, any>) {
    for (const targetPlugin of to_plugin) {
      const plugin = this.pluginManager.getPlugin(targetPlugin)

      if (plugin) {
        this.transportManager.send(plugin.metadata, message)
      } else {
        logger.info(`目标插件不存在: ${targetPlugin}`)
      }
    }
  }

  // 启动服务
  public async start() {
    logger.info('启动设备协调服务...')

    try {
      await this.transportManager.initialize()
      this.pluginManager.startHeartbeatMonitoring()

      logger.info('设备协调服务启动完成')
      logger.info('服务运行在端口 8080')
    } catch (error) {
      logger.error('服务启动失败:', error)
      process.exit(1)
    }
  }
}
