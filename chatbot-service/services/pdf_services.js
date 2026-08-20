import fs from 'fs'
import { extractText } from 'unpdf'

const clean = (t) =>
  t
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

// Returns { fullText, pages } where `pages` is a 1-indexed array of the
// cleaned text on each page. Keeping page boundaries lets chunks (and
// therefore chat citations) point at a real page number in the PDF instead
// of a model-guessed section reference.
const extract_pdf_text = async (file_path) => {
  const data_buffer = fs.readFileSync(file_path)
  const unit8Array = new Uint8Array(data_buffer)

  // mergePages:false -> array of per-page strings, so we can tag every
  // chunk with the page it actually came from.
  const { text } = await extractText(unit8Array, { mergePages: false })

  const rawPages = Array.isArray(text) ? text : [text]
  const pages = rawPages.map((p) => clean(p || ''))
  const fullText = pages.join('\n\n')

  if (process.env.DEBUG_TIMERS === 'true') {
    console.log('Preview:', fullText.slice(0, 600))
  }

  return { fullText, pages }
}

export default extract_pdf_text
