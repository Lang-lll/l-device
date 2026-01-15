import { TransportManager } from './transport/TransportManager'
import { PluginManager } from './PluginManager'

export class OrchestratorService {
  transportManager: TransportManager
  pluginManager: PluginManager
  constructor() {
    this.transportManager = new TransportManager({
      onMessage: (msg) => {
        this.handlePluginMessage(msg)
      },
    })
    this.pluginManager = new PluginManager()
  }

  // 处理来自设备的消息
  private handlePluginMessage(data: Record<string, any>) {
    try {
      switch (data.type) {
        case 'register':
          delete data.type
          this.pluginManager.registerPlugin(data as any)
          this.routeMessage({
            to_plugin: data.plugin_name,
            message: { cmd: 'registered' },
          })
          break
        case 'publish':
          delete data.type
          delete data.transportUrl
          delete data.port
          this.routeMessage(data as any)
          break
        case 'heartbeat':
          this.pluginManager.updateHeartbeat(data.plugin_name)
          break
        default:
          break
      }
    } catch (error) {
      console.error('消息解析错误:', error)
    }
  }

  // 路由消息到指定插件
  private routeMessage(message: {
    to_plugin: string
    message: Record<string, any>
  }) {
    const targetPlugin = message.to_plugin

    if (this.pluginManager.hasPlugin(targetPlugin)) {
      this.sendToPlugin(targetPlugin, message.message)
    } else {
      console.log(`目标插件不存在: ${targetPlugin}`)
    }
  }

  // 发送消息到插件
  private sendToPlugin(pluginName: string, message: Record<string, any>) {
    const plugin = this.pluginManager.getPlugin(pluginName)

    if (plugin) {
      this.transportManager.send(plugin.metadata, message)
    } else {
      console.log(`插件未连接: ${pluginName}`)
    }
  }

  // 启动服务
  public async start() {
    console.log('启动设备协调服务...')

    try {
      await this.transportManager.initialize()
      this.pluginManager.startHeartbeatMonitoring()

      console.log('设备协调服务启动完成')
      console.log('服务运行在端口 8080')
    } catch (error) {
      console.error('服务启动失败:', error)
      process.exit(1)
    }
  }
}
