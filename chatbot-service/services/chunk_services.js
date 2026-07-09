import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const text_to_chunks = async (text) => {
  if (!text) throw new Error('No text provided to chunk')

  const textString = Buffer.isBuffer(text) ? text.toString('utf-8') : String(text)

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 50,
  })

  return splitter.createDocuments([textString])
}

export default text_to_chunks
