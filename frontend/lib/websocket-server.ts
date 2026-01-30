// WebSocket server for real-time client updates
import { Server as SocketIOServer } from "socket.io"
import { getThreatIntelService } from "./real-time-service"
import type { ThreatIntelRecord } from "./database"

export interface WebSocketMessage {
  type: "threat_update" | "feed_status" | "system_status"
  data: any
  timestamp: string
}

export class ThreatIntelWebSocketServer {
  private io: SocketIOServer | null = null
  private threatIntelService = getThreatIntelService()
  private connectedClients = new Set<string>()

  initialize(server: any): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === "production" ? false : "*",
        methods: ["GET", "POST"],
      },
    })

    this.setupEventHandlers()
    this.subscribeToThreatIntel()

    console.log("WebSocket server initialized")
  }

  private setupEventHandlers(): void {
    if (!this.io) return

    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`)
      this.connectedClients.add(socket.id)

      // Send initial data
      this.sendInitialData(socket)

      // Handle client requests
      socket.on("request_recent_threats", async (data) => {
        try {
          const threats = await this.threatIntelService.getRecentThreats(data.hours || 24)
          socket.emit("recent_threats", {
            type: "recent_threats",
            data: threats,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Error fetching recent threats:", error)
          socket.emit("error", {
            type: "error",
            data: { message: "Failed to fetch recent threats" },
            timestamp: new Date().toISOString(),
          })
        }
      })

      socket.on("search_threats", async (data) => {
        try {
          const threats = await this.threatIntelService.searchThreats(data.searchTerm)
          socket.emit("search_results", {
            type: "search_results",
            data: threats,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Error searching threats:", error)
          socket.emit("error", {
            type: "error",
            data: { message: "Failed to search threats" },
            timestamp: new Date().toISOString(),
          })
        }
      })

      socket.on("request_feed_status", async () => {
        try {
          const feedStatuses = await this.threatIntelService.getFeedStatuses()
          socket.emit("feed_status", {
            type: "feed_status",
            data: feedStatuses,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Error fetching feed status:", error)
          socket.emit("error", {
            type: "error",
            data: { message: "Failed to fetch feed status" },
            timestamp: new Date().toISOString(),
          })
        }
      })

      socket.on("toggle_feed", async (data) => {
        try {
          if (data.enabled) {
            await this.threatIntelService.enableFeed(data.feedId)
          } else {
            await this.threatIntelService.disableFeed(data.feedId)
          }

          // Send updated feed status
          const feedStatuses = await this.threatIntelService.getFeedStatuses()
          this.broadcast("feed_status", feedStatuses)
        } catch (error) {
          console.error("Error toggling feed:", error)
          socket.emit("error", {
            type: "error",
            data: { message: "Failed to toggle feed" },
            timestamp: new Date().toISOString(),
          })
        }
      })

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`)
        this.connectedClients.delete(socket.id)
      })
    })
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      // Send recent threats
      const recentThreats = await this.threatIntelService.getRecentThreats(24)
      socket.emit("initial_data", {
        type: "initial_data",
        data: {
          recentThreats,
          connectedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })

      // Send feed status
      const feedStatuses = await this.threatIntelService.getFeedStatuses()
      socket.emit("feed_status", {
        type: "feed_status",
        data: feedStatuses,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error sending initial data:", error)
    }
  }

  private subscribeToThreatIntel(): void {
    // Subscribe to real-time threat intelligence updates
    this.threatIntelService.subscribe((threats: ThreatIntelRecord[]) => {
      this.broadcast("threat_update", threats)
    })
  }

  private broadcast(type: string, data: any): void {
    if (!this.io) return

    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: new Date().toISOString(),
    }

    this.io.emit(type, message)
    console.log(`Broadcasted ${type} to ${this.connectedClients.size} clients`)
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size
  }

  // Manual broadcast methods for external use
  broadcastThreatUpdate(threats: ThreatIntelRecord[]): void {
    this.broadcast("threat_update", threats)
  }

  broadcastSystemStatus(status: any): void {
    this.broadcast("system_status", status)
  }
}

// Global WebSocket server instance
let globalWebSocketServer: ThreatIntelWebSocketServer | null = null

export function getWebSocketServer(): ThreatIntelWebSocketServer {
  if (!globalWebSocketServer) {
    globalWebSocketServer = new ThreatIntelWebSocketServer()
  }
  return globalWebSocketServer
}
