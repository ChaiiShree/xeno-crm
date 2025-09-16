export interface User {
  id: number
  email: string
  name: string
  profilePicture?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginResponse {
  success: boolean
  user: User
  token?: string
}

export interface AuthResponse {
  success: boolean
  authenticated: boolean
  user?: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}
