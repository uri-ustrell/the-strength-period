import { http, HttpResponse } from 'msw'
import { mockMesocycleResponse } from '@/mocks/fixtures/mesocycle'

export const handlers = [
  http.post('/api/generate-plan', async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return HttpResponse.json(mockMesocycleResponse, { status: 200 })
  }),
]
