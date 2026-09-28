import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { AuditAction } from "@/lib/enums";

export async function saveAttachments(documentId: string, userId: string, files: File[]) {
  if (files.length === 0) return;
  for (const file of files) {
    const saved = await saveUploadedFile(file);
    await prisma.documentAttachment.create({
      data: { documentId, uploadedById: userId, ...saved },
    });
  }
  await prisma.auditLog.create({
    data: {
      documentId,
      actorId: userId,
      action: AuditAction.ATTACHED,
      meta: files.map((f) => f.name).join(", "),
    },
  });
}
