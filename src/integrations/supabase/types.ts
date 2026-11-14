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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          complemento: string
          created_at: string
          email: string
          estado: string
          id: string
          nome: string
          numero: string
          rua: string
          updated_at: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string
          created_at?: string
          email: string
          estado?: string
          id?: string
          nome: string
          numero?: string
          rua?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string
          created_at?: string
          email?: string
          estado?: string
          id?: string
          nome?: string
          numero?: string
          rua?: string
          updated_at?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          cor_destaque: string
          email_contato: string
          home_subtitulo: string
          home_titulo: string
          id: number
          logo_url: string | null
          pedido_minimo: number
          texto_como_comprar: string
          texto_faq: string
          texto_privacidade: string
          texto_sobre: string
          texto_trocas: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          cor_destaque?: string
          email_contato?: string
          home_subtitulo?: string
          home_titulo?: string
          id?: number
          logo_url?: string | null
          pedido_minimo?: number
          texto_como_comprar?: string
          texto_faq?: string
          texto_privacidade?: string
          texto_sobre?: string
          texto_trocas?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          cor_destaque?: string
          email_contato?: string
          home_subtitulo?: string
          home_titulo?: string
          id?: number
          logo_url?: string | null
          pedido_minimo?: number
          texto_como_comprar?: string
          texto_faq?: string
          texto_privacidade?: string
          texto_sobre?: string
          texto_trocas?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      faixas_preco: {
        Row: {
          id: string
          preco_peca: number
          produto_id: string
          quantidade_minima: number
        }
        Insert: {
          id?: string
          preco_peca: number
          produto_id: string
          quantidade_minima: number
        }
        Update: {
          id?: string
          preco_peca?: number
          produto_id?: string
          quantidade_minima?: number
        }
        Relationships: [
          {
            foreignKeyName: "faixas_preco_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          codigo_modelo: string
          id: string
          observacao: string
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          produto_nome: string
          qtd_g: number
          qtd_gg: number
          qtd_m: number
          qtd_p: number
          valor: number
        }
        Insert: {
          codigo_modelo?: string
          id?: string
          observacao?: string
          pedido_id: string
          preco_unitario?: number
          produto_id?: string | null
          produto_nome?: string
          qtd_g?: number
          qtd_gg?: number
          qtd_m?: number
          qtd_p?: number
          valor?: number
        }
        Update: {
          codigo_modelo?: string
          id?: string
          observacao?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          produto_nome?: string
          qtd_g?: number
          qtd_gg?: number
          qtd_m?: number
          qtd_p?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_notas: {
        Row: {
          notas: string
          pedido_id: string
          updated_at: string
        }
        Insert: {
          notas?: string
          pedido_id: string
          updated_at?: string
        }
        Update: {
          notas?: string
          pedido_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_notas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          cliente_email: string
          cliente_id: string | null
          cliente_nome: string
          cliente_whatsapp: string
          complemento: string
          created_at: string
          estado: string
          faixa_aplicada: number
          id: string
          numero: number
          numero_endereco: string
          observacao: string
          rua: string
          status: Database["public"]["Enums"]["pedido_status"]
          total: number
          total_pecas: number
          user_id: string | null
        }
        Insert: {
          bairro?: string
          cep?: string
          cidade?: string
          cliente_email?: string
          cliente_id?: string | null
          cliente_nome?: string
          cliente_whatsapp?: string
          complemento?: string
          created_at?: string
          estado?: string
          faixa_aplicada?: number
          id?: string
          numero?: number
          numero_endereco?: string
          observacao?: string
          rua?: string
          status?: Database["public"]["Enums"]["pedido_status"]
          total?: number
          total_pecas?: number
          user_id?: string | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          cliente_email?: string
          cliente_id?: string | null
          cliente_nome?: string
          cliente_whatsapp?: string
          complemento?: string
          created_at?: string
          estado?: string
          faixa_aplicada?: number
          id?: string
          numero?: number
          numero_endereco?: string
          observacao?: string
          rua?: string
          status?: Database["public"]["Enums"]["pedido_status"]
          total?: number
          total_pecas?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_midias: {
        Row: {
          capa_url: string | null
          created_at: string
          id: string
          ordem: number
          principal: boolean
          produto_id: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
          url: string | null
          video_externo: string | null
        }
        Insert: {
          capa_url?: string | null
          created_at?: string
          id?: string
          ordem?: number
          principal?: boolean
          produto_id: string
          tipo?: Database["public"]["Enums"]["midia_tipo"]
          url?: string | null
          video_externo?: string | null
        }
        Update: {
          capa_url?: string | null
          created_at?: string
          id?: string
          ordem?: number
          principal?: boolean
          produto_id?: string
          tipo?: Database["public"]["Enums"]["midia_tipo"]
          url?: string | null
          video_externo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_midias_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo_modelo: string
          composicao: string
          created_at: string
          descricao: string
          destaque: boolean
          estoque: number
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_modelo: string
          composicao?: string
          created_at?: string
          descricao?: string
          destaque?: boolean
          estoque?: number
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo_modelo?: string
          composicao?: string
          created_at?: string
          descricao?: string
          destaque?: boolean
          estoque?: number
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      midia_tipo: "foto" | "video"
      pedido_status:
        | "novo"
        | "em_atendimento"
        | "pago"
        | "enviado"
        | "cancelado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      midia_tipo: ["foto", "video"],
      pedido_status: ["novo", "em_atendimento", "pago", "enviado", "cancelado"],
    },
  },
} as const
