import express from 'express'
import type { Express, Request, Response } from 'express'
import type { PluginOnMessageFn } from '../types/plugins'

export class ExpressManager {
  private app: Express
  private server: any
  private port: number
  private onMessage?: PluginOnMessageFn

  constructor(options?: { port?: number; onMessage?: PluginOnMessageFn }) {
    const { port, onMessage } = options || {}
    this.port = port || 3000
    this.onMessage = onMessage
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware() {
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))
  }

  private setupRoutes() {
    // 健康检查
    this.app.get('/health', (_: Request, res: Response) => {
      res.json({ status: 'ok', service: 'orchestrator' })
    })

    // 获取所有插件状态
    /* this.app.get('/api/plugins', (_: Request, res: Response) => {
      // 从OrchestratorService获取
      this.onMessage?.({
        type: 'get_plugins_status',
        requestId: Date.now().toString(),
        _type: 'http',
      })

      res.json({ message: '' })
    })*/

    // Webhook接收器 - 用于接收插件发来的消息
    this.app.post('/webhook', (req: Request, res: Response) => {
      const message = req.body

      // 触发消息回调
      this.onMessage?.({
        transportUrl: `${req.protocol}://${req.host}`,
        ...message,
        _type: 'http',
      })

      res.json({ received: true })
    })
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Express服务器运行在端口 ${this.port}`)
        resolve()
      })

      this.server.on('error', (error: any) => {
        console.error('Express服务器启动失败:', error)
        reject(error)
      })
    })
  }

  send(target: string, message: Record<string, any>): void {
    const url = `${target}/webhook/orchestrator`

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`HTTP发送失败: ${response.statusText}`)
        }
      })
      .catch((error) => {
        console.error(`HTTP发送错误到 ${target}:`, error)
      })
  }

  async destroy(): Promise<void> {
    if (this.server) {
      this.server.close()
      console.log('Express服务器已关闭')
    }
  }
}
