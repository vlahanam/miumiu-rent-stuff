const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

export async function fetchItems() {
  const res = await fetch(`${API_BASE_URL}/v1/items`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch items')
  return res.json()
}

export async function fetchItem(id: number) {
  const res = await fetch(`${API_BASE_URL}/v1/items/${id}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch item')
  return res.json()
}

export async function createItem(data: Omit<import('@/types').Item, 'id' | 'created_at' | 'updated_at'>) {
  const res = await fetch(`${API_BASE_URL}/v1/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create item')
  return res.json()
}

export async function updateItem(id: number, data: Partial<import('@/types').Item>) {
  const res = await fetch(`${API_BASE_URL}/v1/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update item')
  return res.json()
}

export async function deleteItem(id: number) {
  const res = await fetch(`${API_BASE_URL}/v1/items/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete item')
  return res.json()
}
