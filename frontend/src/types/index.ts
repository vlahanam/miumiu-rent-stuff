export interface Item {
  id: number
  name: string
  description: string
  price_per_day: number
  is_available: boolean
  image_url: string
  category: string
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T
  total?: number
  error?: string | Record<string, string>
  message?: string
}
