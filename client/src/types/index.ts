export interface MemberPickerItem {
  id?: number | null;
  name: string;
  phone?: string | null;
}

export interface Member {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  experience_level?: string | null;
  years_of_service?: number | null;
  roles: string[];
  reading_count?: number;
  current_year_count?: number;
  total_readings?: number;
  created_at?: string | null;
  member_since?: string;
}

export interface Priest {
  id: number;
  name: string;
  title: string;
  full_name: string;
  phone?: string | null;
  active: boolean;
}

export interface CommunityRole {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  members: string[];
}

export interface MassType {
  id: number;
  name: string;
  default_time: string;
  description: string;
  is_special_event: boolean;
  required_roles: string[];
  has_gospel_narration: boolean;
  has_mc_reader: boolean;
  has_third_reading: boolean;
  has_apostles: boolean;
  has_thanksgiving: boolean;
  has_carols: boolean;
  has_morning_adoration: boolean;
  has_departed_souls_reader: boolean;
}

export interface MassAssignment {
  id: number;
  mass_id?: number;
  member_id?: number | null;
  member_name?: string | null;
  role: string;
  notes?: string | null;
}

export interface Apostle {
  id: number;
  apostle_name: string;
  member_name?: string | null;
}

export interface DepartedSoul {
  id: number;
  name: string;
  family_name?: string | null;
}

export interface Mass {
  id: number;
  mass_type: MassType | null;
  date: string;
  time: string;
  celebrant: string;
  notes: string;
  assignments: MassAssignment[];
  apostles: Apostle[];
  departed_souls?: DepartedSoul[];
}

export interface ChangeLogEntry {
  id: number;
  mass_id: number;
  changed_at: string;
  changed_by?: string | null;
  change_reason: string;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  mass_date?: string | null;
  mass_type?: string | null;
}

export interface Stats {
  total_members: number;
  total_masses: number;
  upcoming_masses: number;
  top_volunteers: { id: number; name: string; reading_count: number }[];
}

export interface MemberHistoryEntry {
  date: string;
  mass_type: string;
  role: string;
}

export interface AssignmentInput {
  role: string;
  member_id?: number | null;
  member_name?: string;
  notes?: string | null;
}
