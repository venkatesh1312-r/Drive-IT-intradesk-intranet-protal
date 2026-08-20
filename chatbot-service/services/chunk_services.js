import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

// Accepts an array of per-page strings (see pdf_services.js) and chunks
// each page independently, so every resulting chunk carries the exact
// page_number it came from. This trades a little context-window loss at
// page boundaries for accurate, clickable citations — a fair trade for an
// HR policy doc where chunks map cleanly to sections that rarely straddle
// a page.
const text_to_chunks = async (pages) => {
  if (!pages) throw new Error("No text provided to chunk")

  const pageList = Array.isArray(pages) ? pages : [String(pages)]

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 50,
  })

  const allChunks = []
  for (let i = 0; i < pageList.length; i++) {
    const pageText = pageList[i]
    if (!pageText || !pageText.trim()) continue
    const pageNumber = i + 1
    const docs = await splitter.createDocuments([pageText])
    for (const doc of docs) {
      allChunks.push({ pageContent: doc.pageContent, page_number: pageNumber })
    }
  }

  return allChunks
}

export default text_to_chunks
