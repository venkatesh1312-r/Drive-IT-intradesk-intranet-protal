import fs from 'fs'
import { extractText } from 'unpdf'

const extract_pdf_text = async (file_path) => {
  const data_buffer = fs.readFileSync(file_path)
  const uint8Array = new Uint8Array(data_buffer)

  const { text } = await extractText(uint8Array, { mergePages: true })

  const cleaned = String(text)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  console.log('Preview:', cleaned.slice(0, 300))
  return cleaned
}

export default extract_pdf_text
