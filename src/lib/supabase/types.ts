export type Role = 'manager' | 'worker';
export type TaskStatus = 'new' | 'in_progress' | 'on_review' | 'accepted' | 'returned';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: Role; full_name: string | null; created_at: string };
        Insert: { id: string; role?: Role; full_name?: string | null; created_at?: string };
        Update: { full_name?: string | null; role?: Role };
        Relationships: [];
      };
      objects: {
        Row: { id: string; name: string; address: string; created_at: string; created_by: string };
        Insert: {
          id?: string;
          name: string;
          address: string;
          created_at?: string;
          created_by?: string;
        };
        Update: { name?: string; address?: string };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          object_id: string;
          assignee_id: string;
          status: TaskStatus;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      task_history: {
        Row: {
          id: string;
          task_id: string;
          actor_id: string;
          from_status: TaskStatus | null;
          to_status: TaskStatus;
          comment: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_worker_options: {
        Args: Record<string, never>;
        Returns: { id: string; full_name: string | null; email: string | null }[];
      };
      get_task_people: {
        Args: { p_task_id: string };
        Returns: { id: string; full_name: string | null; email: string | null }[];
      };
      create_task: {
        Args: {
          p_title: string;
          p_description?: string | null;
          p_object_id: string;
          p_assignee_id: string;
        };
        Returns: string;
      };
      update_task_details: {
        Args: {
          p_task_id: string;
          p_title: string;
          p_description?: string | null;
          p_object_id: string;
          p_assignee_id: string;
        };
        Returns: undefined;
      };
      delete_task: { Args: { p_task_id: string }; Returns: undefined };
      transition_task_status: {
        Args: { p_task_id: string; p_to_status: TaskStatus; p_comment?: string | null };
        Returns: undefined;
      };
    };
    Enums: { app_role: Role; task_status: TaskStatus };
    CompositeTypes: Record<string, never>;
  };
};
