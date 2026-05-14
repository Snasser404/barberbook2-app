// Best-effort audit logger. Never throws — auditing must not break the action it's logging.
import { prisma } from './prisma'

export async function audit(opts: {
  actorId?: string | null
  actorEmail?: string | null
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, any> | string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId || null,
        actorEmail: opts.actorEmail || null,
        action: opts.action,
        targetType: opts.targetType || null,
        targetId: opts.targetId || null,
        metadata: opts.metadata
          ? typeof opts.metadata === 'string'
            ? opts.metadata
            : JSON.stringify(opts.metadata)
          : null,
      },
    })
  } catch (err) {
    console.error('[audit] failed:', err)
  }
}
