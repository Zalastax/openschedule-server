import * as Koa from "koa"
import * as KoaRouter from "koa-router"
import * as cors from "kcors"
import * as http from "http"
import * as request from "request-promise"
import { limitSize, requireContentType } from "./request"
import { BoomError } from "boom"

const MAX_SIZE = 10485760
const ICS_MIME = "text/calendar"

// handle all uncaught exceptions
// see - https://nodejs.org/api/process.html#process_event_uncaughtexception
process.on("uncaughtException", (error: any) => console.error("uncaught exception:", error))
// handle all unhandled promise rejections
// see - http://bluebirdjs.com/docs/api/error-management-configuration.html#global-rejection-events
// or for latest node - https://nodejs.org/api/process.html#process_event_unhandledrejection
process.on("unhandledRejection", (error: any) => console.error("unhandled rejection:", error))



const app = new Koa()
const port = parseInt(process.env.NODE_PORT || process.env.PORT || process.argv[2], 10) || 3000
const host = process.env.NODE_HOST || process.env.HOST || "0.0.0.0"

const server = http.createServer(app.callback())

const router = new KoaRouter()


app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    let error = err
    // Search for error with status code
    while (error != null) {
      if (error.isBoom) {
        ctx.status = error.output.statusCode
        ctx.body = error.message
        return
      } else if ((error.statusCode || error.status) != null) {
        ctx.status = error.statusCode || error.status || 500
        ctx.body = error.message
        return
      }

      error = error.cause
    }

    const message = `Internal Server Error ${Date.now()}-${Math.random().toString(36).substring(7)}`

    ctx.status = 500
    ctx.body = message

    console.error(message, err)
  }
})

router.get("/proxy/:path", async (ctx, next) => {
  const req = request(ctx.params.path)

  limitSize(req, MAX_SIZE)
  requireContentType(req, ICS_MIME)

  const data = await req
  ctx.body = data
})

app.use(cors())
app.use(router.routes()).use(router.allowedMethods())

// start the server
server.listen(port, host, (err: Error) => {
  if (err) {
    console.log("Couldn't start server: ", err)
    return
  }

  console.log(`server running at http://${host}:${port}/`)
})
