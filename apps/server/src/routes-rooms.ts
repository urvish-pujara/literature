import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { CreateRoomBodySchema, JoinRoomBodySchema, type Player } from '@literature/shared';
import type { AppContext } from './server.js';
import { generateUniqueCode } from './code-gen.js';
import { signSession } from './jwt.js';

const JOIN_RATE_LIMIT = {
  max: 30,
  timeWindow: '1 minute',
};

export function registerRoomRoutes(fastify: FastifyInstance, ctx: AppContext): void {
  fastify.post('/rooms', async (req, reply) => {
    const parsed = CreateRoomBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const { variant } = parsed.data;
    const roomId = nanoid();
    const hostId = nanoid();
    const code = await generateUniqueCode(ctx.store);
    const host: Player = {
      id: hostId,
      name: 'Host',
      team: 'A',
      seatIndex: 0,
    };
    await ctx.store.create({
      id: roomId,
      code,
      variant,
      hostId,
      status: 'lobby',
      players: [host],
      state: null,
      createdAt: Date.now(),
    });
    const token = await signSession({ playerId: hostId, roomId }, ctx.config.jwtSecret);
    return reply.code(201).send({ roomId, code, playerId: hostId, token });
  });

  fastify.post('/rooms/:code/join', {
    config: { rateLimit: JOIN_RATE_LIMIT },
  }, async (req, reply) => {
    const code = (req.params as { code?: string }).code ?? '';
    const parsed = JoinRoomBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const room = await ctx.store.getByCode(code);
    if (!room) return reply.code(404).send({ error: 'room_not_found' });
    if (room.status !== 'lobby') return reply.code(409).send({ error: 'room_not_joinable' });
    if (room.players.length >= 6) return reply.code(409).send({ error: 'room_full' });

    const playerId = nanoid();
    const takenSeats = new Set(room.players.map((p) => p.seatIndex));
    const nextSeat = [0, 1, 2, 3, 4, 5].find((s) => !takenSeats.has(s)) ?? room.players.length;
    const team = nextSeat % 2 === 0 ? 'A' : 'B';
    const newPlayer: Player = {
      id: playerId,
      name: parsed.data.displayName,
      team,
      seatIndex: nextSeat,
    };

    const updated = await ctx.store.update(room.id, (r) => ({
      ...r,
      players: [...r.players, newPlayer],
    }));
    const token = await signSession({ playerId, roomId: room.id }, ctx.config.jwtSecret);
    if (updated) {
      ctx.io.to(updated.id).emit('lobby:update', {
        roomId: updated.id,
        code: updated.code,
        variant: updated.variant,
        status: updated.status,
        players: updated.players,
        hostId: updated.hostId,
      });
    }
    return reply.code(200).send({ roomId: room.id, playerId, token });
  });

  fastify.get('/rooms/:code', async (req, reply) => {
    const code = (req.params as { code?: string }).code ?? '';
    const room = await ctx.store.getByCode(code);
    if (!room) return reply.code(404).send({ error: 'room_not_found' });
    return reply.send({
      roomId: room.id,
      code: room.code,
      variant: room.variant,
      status: room.status,
      players: room.players,
    });
  });
}
