import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import type { PortInfo } from '@serialport/bindings-interface'
import type { PluginOnMessageFn } from '../types/plugins'

export class SerialManager {
  onMessage: PluginOnMessageFn | null = null
  ports: Map<string, { serialPort: SerialPort; portInfo: PortInfo }>
  constructor(oprions?: { onMessage?: PluginOnMessageFn }) {
    this.ports = new Map()

    if (oprions?.onMessage) {
      this.onMessage = oprions.onMessage
    }
  }

  // 初始化串口管理器
  async initialize() {
    console.log('初始化串口管理器...')

    // 初始扫描
    await this.scanAndConnect()

    // 定期扫描新设备
    setInterval(() => this.scanAndConnect(), 10000)
  }

  // 扫描并连接串口设备
  async scanAndConnect() {
    try {
      const availablePorts = await SerialPort.list()

      for (const portInfo of availablePorts) {
        // 过滤掉系统端口
        if (this.shouldConnect(portInfo)) {
          await this.connectToPort(portInfo)
        }
      }
    } catch (error) {
      console.error('串口扫描错误:', error)
    }
  }

  // 判断是否应该连接该端口
  shouldConnect(portInfo: PortInfo) {
    return (
      !portInfo.path.includes('Bluetooth') &&
      !portInfo.path.includes('ttyAMA') &&
      portInfo.manufacturer
    )
  }

  // 连接到指定端口
  async connectToPort(portInfo: PortInfo) {
    const portPath = portInfo.path

    // 如果已经连接，跳过
    if (this.ports.has(portPath)) {
      return
    }

    try {
      const serialPort = new SerialPort({
        path: portPath,
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      })

      const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }))

      // 设置消息处理器
      parser.on('data', (data: string) => {
        this.handleSerialData(portPath, data.toString().trim())
      })

      // 错误处理
      serialPort.on('error', (error) => {
        console.error(`串口错误 ${portPath}:`, error)
        this.disconnectPort(portPath)
      })

      serialPort.on('close', () => {
        console.log(`串口关闭: ${portPath}`)
        this.disconnectPort(portPath)
      })

      // 保存连接信息
      this.ports.set(portPath, {
        serialPort: serialPort,
        portInfo: portInfo,
      })

      console.log(`串口连接: ${portPath} (${portInfo.manufacturer})`)
    } catch (error) {
      console.error(`连接串口失败 ${portPath}:`, error)
    }
  }

  // 处理串口数据
  handleSerialData(portPath: string, data: string) {
    if (!data) return

    try {
      const message = JSON.parse(data)
      message.port = portPath // 添加端口信息

      // 发射消息到Orchestrator
      this.onMessage?.({ ...message, _type: 'serial' })
    } catch (error) {
      console.log(`原始数据 [${portPath}]:`, data)
    }
  }

  // 发送消息到指定端口
  sendToPort(portPath: string, message: Record<string, any>) {
    if (this.ports.has(portPath)) {
      const port = this.ports.get(portPath)

      try {
        const data = JSON.stringify(message) + '\n'
        port?.serialPort.write(data)
      } catch (error) {
        console.error(`发送消息到 ${portPath} 失败:`, error)
      }
    } else {
      console.log(`端口未连接: ${portPath}`)
    }
  }

  // 断开端口连接
  disconnectPort(portPath: string) {
    if (this.ports.has(portPath)) {
      const port = this.ports.get(portPath)

      if (port?.serialPort.isOpen) {
        port.serialPort.close()
      }

      this.ports.delete(portPath)
      console.log(`断开连接: ${portPath}`)
    }
  }

  // 获取所有连接的端口
  getConnectedPorts() {
    const ports = []

    for (const [path, info] of this.ports) {
      ports.push({
        path: path,
        manufacturer: info.portInfo.manufacturer,
        connected: info.serialPort.isOpen,
      })
    }

    return ports
  }
}
