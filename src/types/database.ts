
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "comments": {
                  Row: {
                    "body": string,"created_at": string,"group_id": string,"updated_at": string,"user_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"group_id": string,"updated_at"?: string,"user_id": string,"visit_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"group_id"?: string,"updated_at"?: string,"user_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_participant_fk"
      columns: ["visit_id","user_id"]
isOneToOne: true
      referencedRelation: "visit_participants"
      referencedColumns: ["visit_id","user_id"]
    },{
      foreignKeyName: "comments_visit_fk"
      columns: ["visit_id","group_id"]
isOneToOne: false
      referencedRelation: "visit_category_stats"
      referencedColumns: ["visit_id","group_id"]
    },{
      foreignKeyName: "comments_visit_fk"
      columns: ["visit_id","group_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id","group_id"]
    }
                  ]
                },"group_invites": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"expires_at": string,"group_id": string,"id": string,"max_uses": number | null,"uses": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"group_id": string,"id"?: string,"max_uses"?: number | null,"uses"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"group_id"?: string,"id"?: string,"max_uses"?: number | null,"uses"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_invites_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"role": Database["public"]['Enums']["group_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["group_role"],"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["group_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_restaurant_notes": {
                  Row: {
                    "group_id": string,"notes": string,"restaurant_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"notes"?: string,"restaurant_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "group_id"?: string,"notes"?: string,"restaurant_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_restaurant_notes_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_restaurant_notes_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_restaurant_notes_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "color": Database["public"]['Enums']["group_color"],"created_at": string,"created_by": string | null,"emoji": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: Database["public"]['Enums']["group_color"],"created_at"?: string,"created_by"?: string | null,"emoji"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "color"?: Database["public"]['Enums']["group_color"],"created_at"?: string,"created_by"?: string | null,"emoji"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_emoji": string | null,"avatar_url": string | null,"created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_emoji"?: string | null,"avatar_url"?: string | null,"created_at"?: string,"display_name": string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_emoji"?: string | null,"avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"restaurants": {
                  Row: {
                    "address": string | null,"city": string | null,"city_key": string | null,"created_at": string,"created_by": string | null,"cuisine_origin": string,"id": string,"name": string,"name_key": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"city_key"?: never,"created_at"?: string,"created_by"?: string | null,"cuisine_origin": string,"id"?: string,"name": string,"name_key"?: never,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"city_key"?: never,"created_at"?: string,"created_by"?: string | null,"cuisine_origin"?: string,"id"?: string,"name"?: string,"name_key"?: never,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "restaurants_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_participants": {
                  Row: {
                    "group_id": string,"joined_at": string,"user_id": string,"visit_id": string,"votes_cast": number
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"user_id": string,"visit_id": string,"votes_cast"?: number
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"user_id"?: string,"visit_id"?: string,"votes_cast"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_participants_visit_fk"
      columns: ["visit_id","group_id"]
isOneToOne: false
      referencedRelation: "visit_category_stats"
      referencedColumns: ["visit_id","group_id"]
    },{
      foreignKeyName: "visit_participants_visit_fk"
      columns: ["visit_id","group_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id","group_id"]
    }
                  ]
                },"visits": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"group_id": string,"host_id": string,"id": string,"price_per_person": number | null,"restaurant_id": string,"reveal_step": number,"room_code": string,"status": Database["public"]['Enums']["visit_status"],"updated_at": string,"visit_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"group_id": string,"host_id"?: string,"id"?: string,"price_per_person"?: number | null,"restaurant_id": string,"reveal_step"?: number,"room_code": string,"status"?: Database["public"]['Enums']["visit_status"],"updated_at"?: string,"visit_date": string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"group_id"?: string,"host_id"?: string,"id"?: string,"price_per_person"?: number | null,"restaurant_id"?: string,"reveal_step"?: number,"room_code"?: string,"status"?: Database["public"]['Enums']["visit_status"],"updated_at"?: string,"visit_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"votes": {
                  Row: {
                    "category": Database["public"]['Enums']["vote_category"],"created_at": string,"group_id": string,"updated_at": string,"user_id": string,"value": number,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["vote_category"],"created_at"?: string,"group_id": string,"updated_at"?: string,"user_id": string,"value": number,"visit_id": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["vote_category"],"created_at"?: string,"group_id"?: string,"updated_at"?: string,"user_id"?: string,"value"?: number,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "votes_participant_fk"
      columns: ["visit_id","user_id"]
isOneToOne: false
      referencedRelation: "visit_participants"
      referencedColumns: ["visit_id","user_id"]
    },{
      foreignKeyName: "votes_visit_fk"
      columns: ["visit_id","group_id"]
isOneToOne: false
      referencedRelation: "visit_category_stats"
      referencedColumns: ["visit_id","group_id"]
    },{
      foreignKeyName: "votes_visit_fk"
      columns: ["visit_id","group_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id","group_id"]
    }
                  ]
                }
          }
          Views: {
            "visit_category_stats": {
                  Row: {
                    "average": number | null,"category": Database["public"]['Enums']["vote_category"],"group_id": string,"max_value": number | null,"min_value": number | null,"stddev": number | null,"visit_id": string,"vote_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "visits_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invite":
{ Args: { "p_code": string }; Returns: string
                           },
"advance_visit":
{ Args: { "p_visit_id": string }; Returns: {
              "closed_at": string | null,
"created_at": string,
"group_id": string,
"host_id": string,
"id": string,
"price_per_person": number | null,
"restaurant_id": string,
"reveal_step": number,
"room_code": string,
"status": Database["public"]['Enums']["visit_status"],
"updated_at": string,
"visit_date": string
            }
                          SetofOptions: {
        from: "*"
        to: "visits"
        isOneToOne: true
        isSetofReturn: false
      } },
"can_create_groups":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"cast_vote":
{ Args: { "p_category": Database["public"]['Enums']["vote_category"],"p_value": number,"p_visit_id": string }; Returns: undefined
                           },
"create_group":
{ Args: { "p_color": Database["public"]['Enums']["group_color"],"p_emoji": string,"p_name": string }; Returns: string
                           },
"create_invite":
{ Args: { "p_group_id": string,"p_max_uses"?: number,"p_valid_days"?: number }; Returns: {
              "code": string,
"created_at": string,
"created_by": string | null,
"expires_at": string,
"group_id": string,
"id": string,
"max_uses": number | null,
"uses": number
            }
                          SetofOptions: {
        from: "*"
        to: "group_invites"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_visit":
{ Args: { "p_address": string,"p_city": string,"p_cuisine_origin": string,"p_group_id": string,"p_price_per_person": number,"p_restaurant_id": string,"p_restaurant_name": string,"p_visit_date": string }; Returns: {
              "closed_at": string | null,
"created_at": string,
"group_id": string,
"host_id": string,
"id": string,
"price_per_person": number | null,
"restaurant_id": string,
"reveal_step": number,
"room_code": string,
"status": Database["public"]['Enums']["visit_status"],
"updated_at": string,
"visit_date": string
            }
                          SetofOptions: {
        from: "*"
        to: "visits"
        isOneToOne: true
        isSetofReturn: false
      } },
"invite_preview":
{ Args: { "p_code": string }; Returns: {
              "group_color": Database["public"]['Enums']["group_color"],"group_emoji": string,"group_id": string,"group_name": string,"is_member": boolean,"member_count": number,"status": string
            }[]
                           },
"join_visit":
{ Args: { "p_code": string }; Returns: {
              "closed_at": string | null,
"created_at": string,
"group_id": string,
"host_id": string,
"id": string,
"price_per_person": number | null,
"restaurant_id": string,
"reveal_step": number,
"room_code": string,
"status": Database["public"]['Enums']["visit_status"],
"updated_at": string,
"visit_date": string
            }
                          SetofOptions: {
        from: "*"
        to: "visits"
        isOneToOne: true
        isSetofReturn: false
      } },
"leave_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"set_comment":
{ Args: { "p_body": string,"p_visit_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "group_color": "tomaquet"|"taronja"|"mostassa"|"oliva"|"salvia"|"blau"|"pruna"|"rosa","group_role": "admin"|"member","visit_status": "voting"|"revealing"|"closed","vote_category": "menjar"|"preu"|"servei"|"espai"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "group_color": ["tomaquet", "taronja", "mostassa", "oliva", "salvia", "blau", "pruna", "rosa"],"group_role": ["admin", "member"],"visit_status": ["voting", "revealing", "closed"],"vote_category": ["menjar", "preu", "servei", "espai"]
          }
        }
} as const
