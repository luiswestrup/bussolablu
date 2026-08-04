export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categoria: {
        Row: {
          criado_em: string
          empresa_id: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
        }
        Relationships: [
          {
            foreignKeyName: "categoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente: {
        Row: {
          contato: string | null
          criado_em: string
          documento: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          contato?: string | null
          criado_em?: string
          documento?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          contato?: string | null
          criado_em?: string
          documento?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      conta_pagar: {
        Row: {
          categoria_id: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          status: Database["public"]["Enums"]["status_pagar"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_pagar"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_pagar"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "conta_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      conta_receber: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          criado_em: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_recebimento: string | null
          id: string
          status: Database["public"]["Enums"]["status_receber"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_recebimento?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_receber"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string
          forma_recebimento?: string | null
          id?: string
          status?: Database["public"]["Enums"]["status_receber"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "conta_receber_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          cnpj: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      fornecedor: {
        Row: {
          contato: string | null
          criado_em: string
          documento: string | null
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          contato?: string | null
          criado_em?: string
          documento?: string | null
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          contato?: string | null
          criado_em?: string
          documento?: string | null
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      movimento_estoque: {
        Row: {
          criado_em: string
          custo_unitario: number | null
          data: string
          empresa_id: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Insert: {
          criado_em?: string
          custo_unitario?: number | null
          data?: string
          empresa_id: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Update: {
          criado_em?: string
          custo_unitario?: number | null
          data?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
        }
        Relationships: [
          {
            foreignKeyName: "movimento_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
        ]
      }
      produto: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          criado_em: string
          custo: number
          empresa_id: string
          estoque_minimo: number
          id: string
          nome: string
          preco_venda: number
          quantidade: number
          sku: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          criado_em?: string
          custo?: number
          empresa_id: string
          estoque_minimo?: number
          id?: string
          nome: string
          preco_venda?: number
          quantidade?: number
          sku?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          criado_em?: string
          custo?: number
          empresa_id?: string
          estoque_minimo?: number
          id?: string
          nome?: string
          preco_venda?: number
          quantidade?: number
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_empresa: {
        Row: {
          criado_em: string
          empresa_id: string
          id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          user_id: string
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pertence_empresa: { Args: { _empresa_id: string }; Returns: boolean }
    }
    Enums: {
      papel_usuario: "admin" | "financeiro" | "estoque"
      status_pagar: "pendente" | "pago" | "vencido"
      status_receber: "pendente" | "recebido" | "vencido"
      tipo_categoria: "despesa" | "receita" | "produto"
      tipo_movimento: "entrada" | "saida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      papel_usuario: ["admin", "financeiro", "estoque"],
      status_pagar: ["pendente", "pago", "vencido"],
      status_receber: ["pendente", "recebido", "vencido"],
      tipo_categoria: ["despesa", "receita", "produto"],
      tipo_movimento: ["entrada", "saida"],
    },
  },
} as const
