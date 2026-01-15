import { OrchestratorService } from '@l-device/orchestrator'

// 启动服务
const orchestrator = new OrchestratorService()
orchestrator.start().catch(console.error)
