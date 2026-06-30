import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const clientRepository = {
  async findAll(active?: boolean, sendReport?: boolean) {
    const where: Prisma.ClientWhereInput = {};
    if (active !== undefined) where.isActive = active;
    if (sendReport !== undefined) where.sendReport = sendReport;

    return prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  async findByExcelClientName(excelClientName: string) {
    return prisma.client.findUnique({ where: { excelClientName } });
  },

  async create(data: Prisma.ClientCreateInput) {
    return prisma.client.create({ data });
  },

  async update(id: string, data: Prisma.ClientUpdateInput) {
    return prisma.client.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.client.delete({ where: { id } });
  },
};
