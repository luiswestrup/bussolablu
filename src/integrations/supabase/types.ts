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
      auditoria: {
        Row: {
          acao: Database["public"]["Enums"]["acao_auditoria"]
          criado_em: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string
          id: string
          registro_id: string | null
          tabela_afetada: string
          usuario_id: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["acao_auditoria"]
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id: string
          id?: string
          registro_id?: string | null
          tabela_afetada: string
          usuario_id?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["acao_auditoria"]
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string
          id?: string
          registro_id?: string | null
          tabela_afetada?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria: {
        Row: {
          criado_em: string
          empresa_id: string
          id: string
          natureza_id: string | null
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          natureza_id?: string | null
          nome: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          natureza_id?: string | null
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
          {
            foreignKeyName: "categoria_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "natureza"
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
      conta_bancaria: {
        Row: {
          agencia: string | null
          banco: string
          conta: string | null
          criado_em: string
          empresa_id: string
          id: string
          saldo_inicial: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco: string
          conta?: string | null
          criado_em?: string
          empresa_id: string
          id?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string
          conta?: string | null
          criado_em?: string
          empresa_id?: string
          id?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conta_bancaria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      conta_pagar: {
        Row: {
          banco_emissor: string | null
          categoria_id: string | null
          cheque_conta_bancaria_id: string | null
          conciliado: boolean
          conciliado_em: string | null
          conta_bancaria_id: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          grupo_parcelamento_id: string | null
          id: string
          numero_cheque: string | null
          numero_documento: string | null
          parcela: string | null
          status: Database["public"]["Enums"]["status_pagar"]
          status_cheque: Database["public"]["Enums"]["status_cheque"] | null
          updated_at: string
          valor: number
          valor_desconto: number
          valor_multa_juros: number
          valor_pago: number | null
          vencimento_estimado: boolean
        }
        Insert: {
          banco_emissor?: string | null
          categoria_id?: string | null
          cheque_conta_bancaria_id?: string | null
          conciliado?: boolean
          conciliado_em?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          grupo_parcelamento_id?: string | null
          id?: string
          numero_cheque?: string | null
          numero_documento?: string | null
          parcela?: string | null
          status?: Database["public"]["Enums"]["status_pagar"]
          status_cheque?: Database["public"]["Enums"]["status_cheque"] | null
          updated_at?: string
          valor: number
          valor_desconto?: number
          valor_multa_juros?: number
          valor_pago?: number | null
          vencimento_estimado?: boolean
        }
        Update: {
          banco_emissor?: string | null
          categoria_id?: string | null
          cheque_conta_bancaria_id?: string | null
          conciliado?: boolean
          conciliado_em?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          grupo_parcelamento_id?: string | null
          id?: string
          numero_cheque?: string | null
          numero_documento?: string | null
          parcela?: string | null
          status?: Database["public"]["Enums"]["status_pagar"]
          status_cheque?: Database["public"]["Enums"]["status_cheque"] | null
          updated_at?: string
          valor?: number
          valor_desconto?: number
          valor_multa_juros?: number
          valor_pago?: number | null
          vencimento_estimado?: boolean
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
            foreignKeyName: "conta_pagar_cheque_conta_bancaria_id_fkey"
            columns: ["cheque_conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "conta_bancaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conta_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "conta_bancaria"
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
          banco_emissor: string | null
          categoria_id: string | null
          cliente_id: string | null
          conciliado: boolean
          conciliado_em: string | null
          conta_bancaria_id: string | null
          criado_em: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_recebimento: string | null
          grupo_parcelamento_id: string | null
          id: string
          numero_cheque: string | null
          numero_documento: string | null
          parcela: string | null
          status: Database["public"]["Enums"]["status_receber"]
          status_cheque: Database["public"]["Enums"]["status_cheque"] | null
          updated_at: string
          valor: number
          valor_desconto: number
          valor_multa_juros: number
          valor_recebido: number | null
        }
        Insert: {
          banco_emissor?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          conciliado?: boolean
          conciliado_em?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string
          forma_recebimento?: string | null
          grupo_parcelamento_id?: string | null
          id?: string
          numero_cheque?: string | null
          numero_documento?: string | null
          parcela?: string | null
          status?: Database["public"]["Enums"]["status_receber"]
          status_cheque?: Database["public"]["Enums"]["status_cheque"] | null
          updated_at?: string
          valor: number
          valor_desconto?: number
          valor_multa_juros?: number
          valor_recebido?: number | null
        }
        Update: {
          banco_emissor?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          conciliado?: boolean
          conciliado_em?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string
          forma_recebimento?: string | null
          grupo_parcelamento_id?: string | null
          id?: string
          numero_cheque?: string | null
          numero_documento?: string | null
          parcela?: string | null
          status?: Database["public"]["Enums"]["status_receber"]
          status_cheque?: Database["public"]["Enums"]["status_cheque"] | null
          updated_at?: string
          valor?: number
          valor_desconto?: number
          valor_multa_juros?: number
          valor_recebido?: number | null
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
            foreignKeyName: "conta_receber_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "conta_bancaria"
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
      convite: {
        Row: {
          aceito_em: string | null
          convidado_por: string | null
          criado_em: string
          email: string
          empresa_id: string
          id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          pode_ver_consolidado: boolean
          status: string
        }
        Insert: {
          aceito_em?: string | null
          convidado_por?: string | null
          criado_em?: string
          email: string
          empresa_id: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          pode_ver_consolidado?: boolean
          status?: string
        }
        Update: {
          aceito_em?: string | null
          convidado_por?: string | null
          criado_em?: string
          email?: string
          empresa_id?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          pode_ver_consolidado?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "convite_empresa_id_fkey"
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
      natureza: {
        Row: {
          criado_em: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "natureza_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_fiscal_importada: {
        Row: {
          chave_acesso: string
          criado_em: string
          data_emissao: string | null
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero_nota: string | null
          observacao: string | null
          status: string
          valor_total: number
        }
        Insert: {
          chave_acesso: string
          criado_em?: string
          data_emissao?: string | null
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero_nota?: string | null
          observacao?: string | null
          status?: string
          valor_total?: number
        }
        Update: {
          chave_acesso?: string
          criado_em?: string
          data_emissao?: string | null
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero_nota?: string | null
          observacao?: string | null
          status?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "nota_fiscal_importada_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_importada_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedor"
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
      produto_fornecedor_map: {
        Row: {
          codigo_produto_fornecedor: string
          criado_em: string
          empresa_id: string
          fornecedor_id: string
          id: string
          produto_id: string
        }
        Insert: {
          codigo_produto_fornecedor: string
          criado_em?: string
          empresa_id: string
          fornecedor_id: string
          id?: string
          produto_id: string
        }
        Update: {
          codigo_produto_fornecedor?: string
          criado_em?: string
          empresa_id?: string
          fornecedor_id?: string
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_fornecedor_map_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedor_map_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedor_map_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
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
          pode_ver_consolidado: boolean
          user_id: string
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          pode_ver_consolidado?: boolean
          user_id: string
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          pode_ver_consolidado?: boolean
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
      e_admin: { Args: never; Returns: boolean }
      e_admin_empresa: { Args: { _empresa_id: string }; Returns: boolean }
      meus_papeis: {
        Args: never
        Returns: {
          empresa_id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
        }[]
      }
      pertence_empresa: { Args: { _empresa_id: string }; Returns: boolean }
      pode_consolidar: { Args: never; Returns: boolean }
      usuarios_da_empresa: {
        Args: never
        Returns: {
          criado_em: string
          email: string
          empresa_id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          pode_ver_consolidado: boolean
          user_id: string
          vinculo_id: string
        }[]
      }
    }
    Enums: {
      acao_auditoria: "criado" | "editado" | "excluido"
      natureza_categoria: "mercadoria" | "servico" | "outro"
      papel_usuario: "admin" | "financeiro" | "estoque"
      status_cheque: "emitido" | "compensado" | "devolvido" | "cancelado"
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
      acao_auditoria: ["criado", "editado", "excluido"],
      natureza_categoria: ["mercadoria", "servico", "outro"],
      papel_usuario: ["admin", "financeiro", "estoque"],
      status_cheque: ["emitido", "compensado", "devolvido", "cancelado"],
      status_pagar: ["pendente", "pago", "vencido"],
      status_receber: ["pendente", "recebido", "vencido"],
      tipo_categoria: ["despesa", "receita", "produto"],
      tipo_movimento: ["entrada", "saida"],
    },
  },
} as const
