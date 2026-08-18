// server/services/document_services.js
// Read/delete helpers for POLICY_DOC — backs the "Documents" admin UI
// (Recent Uploads + Documents Available lists) in Settings → Organization.
import prisma from '../config/prisma.js'

// All documents, most recently uploaded first. Used for the "Documents
// Available" table (view/delete) and, sliced client-side, for "Recent Uploads".
export const list_documents = async () => {
  return prisma.policyDoc.findMany({
    orderBy: { uploadat: 'desc' },
    select: { pd_id: true, file_name: true, uploadat: true },
  })
}

// Every document from the most recent upload batch — so uploading 5 files
// shows 5 in "Recent Uploads", uploading 10 shows all 10, etc., rather than
// a fixed row count. `hardCap` is just a sanity ceiling in case a batch id
// is somehow missing and we'd otherwise fall back to "everything".
export const list_recent_documents = async (hardCap = 50) => {
  const latest = await prisma.policyDoc.findFirst({
    orderBy: { uploadat: 'desc' },
    select: { upload_batch: true },
  })

  if (!latest) return []

  // Legacy rows (inserted before upload_batch existed) have a null batch —
  // in that case just fall back to the single most recent row so we don't
  // accidentally return the whole library.
  if (!latest.upload_batch) {
    return prisma.policyDoc.findMany({
      orderBy: { uploadat: 'desc' },
      take: 1,
      select: { pd_id: true, file_name: true, uploadat: true },
    })
  }

  return prisma.policyDoc.findMany({
    where: { upload_batch: latest.upload_batch },
    orderBy: { uploadat: 'desc' },
    take: hardCap,
    select: { pd_id: true, file_name: true, uploadat: true },
  })
}

export const get_document_by_id = async (pd_id) => {
  return prisma.policyDoc.findUnique({
    where: { pd_id },
    select: { pd_id: true, file_name: true, uploadat: true },
  })
}

// Deleting the PolicyDoc row cascades to CHUNKED_POLICY_DOC (onDelete: Cascade
// in schema.prisma), so embeddings are cleaned up automatically.
export const delete_document_by_id = async (pd_id) => {
  return prisma.policyDoc.delete({ where: { pd_id } })
}
