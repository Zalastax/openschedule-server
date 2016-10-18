import * as request from "request-promise"
import { forbidden } from "boom"

export function limitSize(req: request.RequestPromise, maxSize: number) {
  function limitSize(size: number) {
      if (size > maxSize) {
        req.abort()
        const error = forbidden(`Resource stream exceeded limit (${size})`)
        req.emit("error", error)
      }
    }

    let dataSize = 0
    req.on("response", response => {
      limitSize(response.headers["content-length"] || 0)
    }).on("data", data => {
      dataSize += data.length
      limitSize(dataSize)
    })
}

export function requireContentType(req: request.RequestPromise, contentType: string) {
  req.on("response", response => {
    const ct: string | undefined = response.headers["content-type"]
    if (!(ct && ct.includes(contentType))) {
      req.abort()
      const error = forbidden(`Content-type ${contentType} is required. Resource had ${ct || "no"} content-type`)
      req.emit("error", error)
    }
  })
}
