import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing
  await prisma.client.deleteMany();

  // Create demo clients
  await prisma.client.create({
    data: {
      excelClientName: "SANMATI PLAST INDIA",
      displayName: "Sanmati Plast India",
      companyName: "Sanmati Plast India Pvt. Ltd.",
      toEmails: "sanmati@example.com\norders@sanmati.example.com",
      ccEmails: "",
      bccEmails: "archive@company.com",
      subject: "Daily Logistics Report for Sanmati Plast",
      bodyTemplate: "Hello,\n\nPlease find the attached daily logistics report.\n\nThanks,\nLogistics Team",
      sendReport: true,
      isActive: true,
    },
  });

  console.log("Database seeded with 2 active demo clients.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
