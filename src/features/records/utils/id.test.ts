import { afterEach, describe, expect, it, vi } from "vitest"
import { newId } from "./id"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("newId", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns a v4 uuid", () => {
    expect(newId()).toMatch(uuidPattern)
  })

  it("still works when crypto.randomUUID is unavailable (insecure context)", () => {
    const realCrypto = crypto
    vi.stubGlobal("crypto", { getRandomValues: (array: Uint8Array) => realCrypto.getRandomValues(array) })
    const first = newId()
    expect(first).toMatch(uuidPattern)
    expect(newId()).not.toBe(first)
  })
})
