// Real database integration for threat intelligence storage
import { createClient } from "@supabase/supabase-js"

export interface ThreatIntelRecord {
  id: string
  title: string
  description: string
  severity: "Critical" | "High" | "Medium" | "Low"
  published: string
  updated: string
  source: string
  source_url: string
  sectors: string[]
  indicators: {
    type: string
    value: string
    confidence: number
  }[]
  mitre_techniques: string[]
  tags: string[]
  tlp: string
  raw_data: any
  created_at?: string
  updated_at?: string
}

export interface FeedStatus {
  id: string
  name: string
  url: string
  type: string
  category: string
  enabled: boolean
  last_fetch: string | null
  status: "active" | "error" | "disabled"
  update_frequency: number
  error_count: number
  last_error: string | null
}

class ThreatIntelDatabase {
  private supabase: any

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co"
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key"
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async insertThreatIntel(data: Omit<ThreatIntelRecord, "created_at" | "updated_at">): Promise<void> {
    try {
      const { error } = await this.supabase.from("threat_intelligence").upsert(
        {
          ...data,
          indicators: JSON.stringify(data.indicators),
          raw_data: JSON.stringify(data.raw_data),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )

      if (error) {
        console.error("Database insert error:", error)
        throw error
      }
    } catch (error) {
      console.error("Error inserting threat intel:", error)
      throw error
    }
  }

  async getRecentThreats(hours = 24, limit = 100): Promise<ThreatIntelRecord[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - hours)

      const { data, error } = await this.supabase
        .from("threat_intelligence")
        .select("*")
        .gte("published", cutoffDate.toISOString())
        .order("published", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Database query error:", error)
        throw error
      }

      return data?.map(this.parseRecord) || []
    } catch (error) {
      console.error("Error fetching recent threats:", error)
      return []
    }
  }

  async searchThreats(searchTerm: string, limit = 50): Promise<ThreatIntelRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from("threat_intelligence")
        .select("*")
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
        .order("published", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Database search error:", error)
        throw error
      }

      return data?.map(this.parseRecord) || []
    } catch (error) {
      console.error("Error searching threats:", error)
      return []
    }
  }

  async getThreatsBySeverity(severity: string, limit = 50): Promise<ThreatIntelRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from("threat_intelligence")
        .select("*")
        .eq("severity", severity)
        .order("published", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Database query error:", error)
        throw error
      }

      return data?.map(this.parseRecord) || []
    } catch (error) {
      console.error("Error fetching threats by severity:", error)
      return []
    }
  }

  async getThreatsBySector(sector: string, limit = 50): Promise<ThreatIntelRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from("threat_intelligence")
        .select("*")
        .contains("sectors", [sector])
        .order("published", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Database query error:", error)
        throw error
      }

      return data?.map(this.parseRecord) || []
    } catch (error) {
      console.error("Error fetching threats by sector:", error)
      return []
    }
  }

  async updateFeedStatus(feedStatus: FeedStatus): Promise<void> {
    try {
      const { error } = await this.supabase.from("feed_status").upsert(feedStatus, {
        onConflict: "id",
      })

      if (error) {
        console.error("Feed status update error:", error)
        throw error
      }
    } catch (error) {
      console.error("Error updating feed status:", error)
      throw error
    }
  }

  async getFeedStatuses(): Promise<FeedStatus[]> {
    try {
      const { data, error } = await this.supabase.from("feed_status").select("*").order("name")

      if (error) {
        console.error("Database query error:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("Error fetching feed statuses:", error)
      return []
    }
  }

  private parseRecord(record: any): ThreatIntelRecord {
    return {
      ...record,
      indicators: typeof record.indicators === "string" ? JSON.parse(record.indicators) : record.indicators,
      raw_data: typeof record.raw_data === "string" ? JSON.parse(record.raw_data) : record.raw_data,
    }
  }
}

export const threatIntelDB = new ThreatIntelDatabase()
