import fs from 'fs'
import { extractText } from 'unpdf'


const extract_pdf_text= async(file_path)=>{

    let data_buffer=fs.readFileSync(file_path)

    let unit8Array =new Uint8Array(data_buffer)

    const { text } = await extractText(unit8Array, { mergePages: true }) // ← add this
    
    const cleaned = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  if (process.env.DEBUG_TIMERS === 'true') {
    console.log("Preview:", cleaned.slice(0, 600))  // verify it looks right
  }
  return cleaned
}

export default extract_pdf_text