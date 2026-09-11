/** Parse a fetch response as JSON; surface HTML/plain server errors clearly. */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) {
    throw new Error(`Empty server response (${res.status})`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120)
    if (/an error occurred/i.test(text)) {
      throw new Error(
        'Server timed out while checking launch fee — retry in a moment, or pay the $EYES fee when prompted.',
      )
    }
    throw new Error(`Server error (${res.status}): ${snippet}`)
  }
}
