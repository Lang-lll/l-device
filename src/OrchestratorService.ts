import { TransportManager } from "./transport/TransportManager";
import { PluginManager } from "./PluginManager";

export class OrchestratorService {
  transportManager: TransportManager;
  pluginManager: PluginManager;
  constructor() {
    this.transportManager = new TransportManager({
      onMessage: (msg) => {
        this.handleIncomingMessage(msg);
      },
    });
    this.pluginManager = new PluginManager();
  }

  // 处理来自设备的消息
  handleIncomingMessage(data: Record<string, any>) {
    try {
      switch (data.type) {
        case "register":
          this.pluginManager.registerPlugin(data as any);
          this.routeMessage({
            to_plugin: data.plugin_name,
            message: { cmd: "registered" },
          });
          break;
        case "publish":
          this.routeMessage(data as any);
          break;
        case "heartbeat":
          this.pluginManager.updateHeartbeat(data.plugin_name);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("消息解析错误:", error);
    }
  }

  // 处理来自外部的消息
  handleExternalMessage(data: Record<string, any>) {
    try {
      const message = typeof data === "string" ? JSON.parse(data) : data;

      if (message.to_plugin && message.message) {
        this.sendToPlugin(message.to_plugin, message.message);
      }
    } catch (error) {
      console.error("外部消息处理错误:", error);
    }
  }

  // 路由消息到指定插件
  routeMessage(message: { to_plugin: string; message: Record<string, any> }) {
    const targetPlugin = message.to_plugin;

    if (this.pluginManager.hasPlugin(targetPlugin)) {
      this.sendToPlugin(targetPlugin, message.message);
    } else {
      console.log(`⚠️  目标插件不存在: ${targetPlugin}`);
    }
  }

  // 发送消息到插件
  sendToPlugin(pluginName: string, message: Record<string, any>) {
    const plugin = this.pluginManager.getPlugin(pluginName);

    if (plugin?.metadata?.port) {
      const msg = {
        to_plugin: pluginName,
        message: message,
      };

      this.transportManager.send(plugin.metadata, msg);
    } else {
      console.log(`⚠️  插件未连接: ${pluginName}`);
    }
  }

  // 启动服务
  async start() {
    console.log("🚀 启动设备协调服务...");

    try {
      await this.transportManager.initialize();
      this.pluginManager.startHeartbeatMonitoring();

      console.log("✅ 设备协调服务启动完成");
      console.log("📡 服务运行在端口 8080");
    } catch (error) {
      console.error("❌ 服务启动失败:", error);
      process.exit(1);
    }
  }
}
