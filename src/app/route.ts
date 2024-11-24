import { prisma } from "@/services/prisma.service";

export const maxDuration = 240;

export async function POST(req: Request) {
  try {
    // 1. Validasi API Key
    if (req.headers.get("x-api-key") !== process.env.VALIDATION_KEY) {
      return new Response(
        JSON.stringify({
          error: "Invalid or missing API key",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Ambil data Major
    const majors = await prisma.major.findMany({
      select: {
        id: true, // ID untuk query detail
        abbr: true,
        name: true,
        faculty: true,
      },
    });

    // 3. Loop melalui data Major
    const recapData = [];
    for (const major of majors) {
      
      // Ambil detail voters untuk major tertentu
      const voters = await prisma.voter.findMany({
        where: { majorId: major.id }, // Filter berdasarkan ID major
        select: {
          validationData: {
            select: { id: true },
            distinct: ["id"],
          },
          voteData: {
            select: { id: true },
            distinct: ["id"],
          },
        },
      });

      // Hitung total validasi dan voting
      const total_validations = voters.reduce(
        (count, voter) => count + voter.validationData.length,
        0
      );
      const total_votes = voters.reduce(
        (count, voter) => count + voter.voteData.length,
        0
      );

      // Tambahkan data ke recapData
      recapData.push({
        major_abbr: major.abbr,
        major_name: major.name,
        faculty: major.faculty,
        total_voters: voters.length,
        total_validations,
        total_votes,
      });

      console.log(`[RECAP_MAJOR]: ${major.name}`);
    }

    // 4. Urutkan data berdasarkan total votes
    const sortedRecapData = recapData.sort(
      (a, b) => b.total_votes - a.total_votes
    );

    // 5. Simpan data ke monitoringData
    await prisma.monitoringData.create({
      select: {
        id: true,
      },
      data: {
        content: sortedRecapData,
      },
    });

    // 6. Kembalikan respons
    return new Response(
      JSON.stringify({
        data: sortedRecapData,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan saat memproses data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
