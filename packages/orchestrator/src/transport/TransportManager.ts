import { ExpressManager } from './ExpressManager'
import { SerialManager } from './SerialManager'
import type { PluginMetadata, PluginOnMessageFn } from '../types/plugins'

export class TransportManager {
  expressManager: ExpressManager
  serialManager: SerialManager
  constructor(options?: { port?: number; onMessage?: PluginOnMessageFn }) {
    const { port, onMessage } = options || {}
    this.expressManager = new ExpressManager({ port, onMessage })
    this.serialManager = new SerialManager({ onMessage })
  }

  initialize() {
    this.serialManager.initialize()
    this.expressManager.initialize()
  }

  send(metadata: PluginMetadata, message: Record<string, any>) {
    if (metadata._type === 'serial' && metadata.port) {
      this.serialManager.sendToPort(metadata.port, message)
    } else if (metadata._type === 'http' && metadata.transportUrl) {
      this.expressManager.send(metadata.transportUrl, message)
    }
  }
}
