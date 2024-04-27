import { Hono } from 'hono'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7,
)


type Env = {
	SHORT_URLS: KVNamespace
}
  
const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

async function shorten(kv: KVNamespace, url: string) { //TODO: fix TypeError: Cannot read properties of undefined (reading 'put')
	const key = nanoid()
	const createdAt = Date.now()
	await kv.put(key, JSON.stringify({ url, createdAt }))
	return { key }
}
  
app.post('/api/links', async (c) => {
	const body = await c.req.parseBody()
	console.log(body)
	const { url } = body
	// const { url } = await c.req.json<{ url: string }>()
	if (!url) {
		return c.json({
			'Error': 'Missing URL'
		}, 400)
	}
	const { key } = await shorten(c.env.SHORT_URLS, url)
	return c.json({ key, url })
})

interface URL {
	url: string
	createdAt: number
}
  
async function getUrl(kv: KVNamespace, key: string) {
	return kv.get<URL>(key, 'json')
}
  
app.get('/api/links/:key', async (c) => {
	const key = c.req.param('key')
	const res = await getUrl(c.env.SHORT_URLS, key)
	if (!res) {
		return c.notFound()
	}
	return c.json({ key, url: res.url })
})

export default app
