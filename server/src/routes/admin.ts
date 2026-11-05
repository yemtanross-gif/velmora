import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireOwner, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// Owner + Support can list users (Support has limited fields)
adminRouter.get('/users', requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    const isOwner = req.user!.role === 'OWNER';
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        createdAt: true,
        lastLoginAt: true,
        ...(isOwner ? {} : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Only Owner can suspend / change roles (never promote another OWNER)
adminRouter.patch('/users/:id', requireOwner, async (req, res, next) => {
  try {
    const { isSuspended, isActive, role } = req.body;
    if (role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot create additional Owner accounts' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(typeof isSuspended === 'boolean' ? { isSuspended } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(role === 'USER' || role === 'SUPPORT' ? { role } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'USER_UPDATE',
        resource: 'User',
        resourceId: user.id,
        details: JSON.stringify({ isSuspended, isActive, role }),
      },
    });
    res.json({ user: { id: user.id, email: user.email, role: user.role, isSuspended: user.isSuspended } });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/transactions', requireRole('OWNER', 'SUPPORT'), async (req, res, next) => {
  try {
    const txs = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true } } },
    });
    res.json({ transactions: txs });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit', requireOwner, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/system/withdrawal-suspend', requireOwner, async (req, res, next) => {
  try {
    const enabled = Boolean(req.body.enabled);
    await prisma.systemConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', withdrawalEnabled: enabled },
      update: { withdrawalEnabled: enabled, updatedBy: req.user!.id },
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        action: enabled ? 'WITHDRAWAL_ENABLED' : 'WITHDRAWAL_SUSPENDED',
        resource: 'SystemConfig',
      },
    });
    res.json({ withdrawalEnabled: enabled });
  } catch (err) {
    next(err);
  }
});
