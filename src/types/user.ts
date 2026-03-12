export interface User {
  id: string;
  email?: string;
  msisdn?: string;
  firstname?: string;
  lastname?: string;
  subscribed: boolean;
  token?: string;
}

export interface LoginResponse {
  code: number;
  error: number;
  data: {
    user_id: number;
    userdve_ticket?: string;
  };
}

export interface AccountInfo {
  user_id: string;
  email?: string;
  msisdn?: string;
  firstname?: string;
  lastname?: string;
  subscribed?: boolean;
  token?: string;
}
