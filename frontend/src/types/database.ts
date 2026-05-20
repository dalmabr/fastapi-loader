// ============================================================
// TIPOS DO SUPABASE - Gerado manualmente baseado no schema
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'operator'
          ativo: boolean
          created_at: string
          user_code: string | null
        }
        Insert: {
          id: string
          email: string
          role?: 'admin' | 'operator'
          ativo?: boolean
          created_at?: string
          user_code?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'operator'
          ativo?: boolean
          user_code?: string | null
        }
        Relationships: []
      }
      arquivos_gerados: {
        Row: {
          id: string
          nome_arquivo: string
          data_geracao: string
          data_atualizacao: string
          bandeira: string
          template_id: string
          quantidade_registros: number
          usuario: string
          status: string
          valor_total: number
        }
        Insert: {
          id?: string
          nome_arquivo: string
          data_geracao?: string
          data_atualizacao?: string
          bandeira: string
          template_id: string
          quantidade_registros?: number
          usuario: string
          status?: string
          valor_total?: number
        }
        Update: {
          id?: string
          nome_arquivo?: string
          data_geracao?: string
          data_atualizacao?: string
          bandeira?: string
          template_id?: string
          quantidade_registros?: number
          usuario?: string
          status?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_gerados_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "templates"
            referencedColumns: ["id"]
          }
        ]
      }
      registros_arquivo: {
        Row: {
          id: string
          arquivo_id: string
          siaidcd: string
          bandeira: string
          pan: string
          expiry_date: string
          tran_amount: number
          brl_amount: number
          tran_currency: string
          currency: string
          merchant_name: string
          token: string
          nr_parcelas: number
          data_transacao: string | null
          hora_transacao: string | null
          user_auditoria: string
          ordem: number
        }
        Insert: {
          id?: string
          arquivo_id: string
          siaidcd: string
          bandeira: string
          pan: string
          expiry_date: string
          tran_amount: number
          brl_amount?: number
          tran_currency: string
          currency: string
          merchant_name: string
          token?: string
          nr_parcelas?: number
          data_transacao?: string | null
          hora_transacao?: string | null
          user_auditoria: string
          ordem: number
        }
        Update: {
          id?: string
          arquivo_id?: string
          siaidcd?: string
          bandeira?: string
          pan?: string
          expiry_date?: string
          tran_amount?: number
          brl_amount?: number
          tran_currency?: string
          currency?: string
          merchant_name?: string
          token?: string
          nr_parcelas?: number
          data_transacao?: string | null
          hora_transacao?: string | null
          user_auditoria?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "registros_arquivo_arquivo_id_fkey"
            columns: ["arquivo_id"]
            referencedRelation: "arquivos_gerados"
            referencedColumns: ["id"]
          }
        ]
      }
      templates: {
        Row: {
          id: string
          nome: string
          bandeira: string
          siaidcd: string
        }
        Insert: {
          id?: string
          nome: string
          bandeira: string
          siaidcd: string
        }
        Update: {
          id?: string
          nome?: string
          bandeira?: string
          siaidcd?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================
// TIPOS AUXILIARES
// ============================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
