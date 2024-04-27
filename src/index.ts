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


const rooturl = 'https://r.a1z.uk'

/*
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html>
	<title>URL Shortener</title>
	<body>
		<h1>Simple URL Shortener</h1>
		<div class="howto">
			<h2>How to use?</h2>
			<ul>
				<li>(作成)<code>/api/links</code>にPOSTする</li>
				<p>リクエスト、レスポンスの内容は共にjson形式です。</p>
				<p><code>{"url": "https://example.com"}</code>のようにしてPOSTしてください。</p>

				<li>(使用)<code>/短縮リンク</code>にアクセスする</li>
				<p>生成した短縮リンクにアクセスすると自動でリダイレクトされます。</p>
			</ul>
		</div>
	</body>
</html>

<style>
	html {
		background-color: antiquewhite;
	}
</style>
`)
})
*/

app.get('/', (c) => {
    return c.html(`
        <html>
		<head>
			<meta charset="UTF-8" />
			<meta name="description" content="ながーーーいURLを短縮っ!" />
			<meta property="og:site_name" content="r.a1z.uk">
			<meta name="theme-color" content="#FACEFA">
			<title>Simple URL Shortener</title>
		</head>
            <h1>Simple URL Shortener</h1>
            <div>
                <span>ながーーーいURLを短縮できます</span>
            </div>
            <form action='/shorten' method='post'>
                <div>
                    <label>URL</label>
                    <input type='url' name='url' required />
                    <button>短縮!</button>
                </div>
            </form>
        </html>
		<style>
			html {
				display: flex;
				justify-content: center;
				text-align: center;
			}
		</style>
    `)
})


app.get('/favicon.ico', async (c) => {
	return c.text('無理', 404)
})

async function shorten(kv: KVNamespace, url: string) { //TODO: fix TypeError: Cannot read properties of undefined (reading 'put')
	const key = nanoid()
	const createdAt = Date.now()
	await kv.put(key, JSON.stringify({ url, createdAt }))
	return { key }
}


app.post('/shorten', async (c) => {
	const body = await c.req.parseBody<{url: string}>()
	console.log(body)
	const { url } = body
	// const { url } = await c.req.json<{ url: string }>()
	if (!url || typeof url !="string") {
		return c.html('<p>無効なURLが入力されました。</p>', 400)
	}
	const { key } = await shorten(c.env.SHORT_URLS, url)
	// return c.json({ key, url })
	return c.html(`
	<h1>生成しました!</h1>
	<p id="url">${rooturl}/${key}</p>
	<p>リダイレクト先: ${url}</p>
	<style>
		html {
			display: flex;
			justify-content: center;
			text-align: center;
		}
	</style>
	`)
})

app.get('/shorten', async (c) => {
	return c.text('どこ見てんの?')
})

app.post('/api/links', async (c) => {
	const body = await c.req.parseBody<{url: string}>()
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

app.get('/:key', async (c) => {
	const key = c.req.param('key')
	const res = await getUrl(c.env.SHORT_URLS, key)
	if (!res) {
		return c.text('存在しない短縮リンクです。', 404)
	}
	const url = res.url
	return c.redirect(url, 301)
})
  
app.get('/api/links/:key', async (c) => {
	const key = c.req.param('key')
	const res = await getUrl(c.env.SHORT_URLS, key)
	if (!res) {
		return c.notFound()
	}
	return c.json({ key, url: res.url })
})

export default app
