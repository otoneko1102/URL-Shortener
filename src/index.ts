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


const rooturl = 'https://oto.pet'

app.get('/', (c) => {
  return c.html(`
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="description" content="URLを短縮します" />
        <meta property="og:site_name" content="oto.pet">
        <meta name="theme-color" content="#FACEFA">
        <title>Simple URL Shortener</title>
        <style>
          html {
            display: flex;
            justify-content: center;
            text-align: center;
          }
          h1 {
            font-size: 1.5rem;
          }
          form {
            margin-top: 1rem;
          }
          input[type="url"] {
            width: 80%;
            padding: 0.5rem;
            font-size: 1rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
          }
          button {
            margin-left: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 1rem;
            cursor: pointer;
            background-color: #007BFF;
            color: white;
            border: none;
            border-radius: 4px;
          }
          button:hover {
            background-color: #0056b3;
          }
          .result {
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <h1>Simple URL Shortener</h1>
        <p>ながーーーいURLを短縮できます</p>
        <form action='/shorten' method='post'>
          <label for="url">URL</label><br>
          <input type='url' id="url" name='url' required><br>
          <button type="submit">短縮!</button>
        </form>
        <div class="result"></div>
      </body>
    </html>
  `)
})


app.get('/favicon.ico', async (c) => {
  return c.text('Not found.', 404)
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
  return c.html(`
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="description" content="URLを短縮します" />
        <meta property="og:site_name" content="oto.pet">
        <meta name="theme-color" content="#FACEFA">
        <title>URL短縮完了</title>
        <style>
          html {
            display: flex;
            justify-content: center;
            text-align: center;
          }
          h1 {
            font-size: 1.5rem;
          }
          p {
            font-size: 1rem;
          }
          .url {
            margin-top: 1rem;
            font-size: 1.2rem;
            color: #007BFF;
          }
        </style>
      </head>
      <body>
        <h1>生成しました!</h1>
        <p>リダイレクト先: ${url}</p>
        <p class="url">${rooturl}/${key}</p>
      </body>
    </html>
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
