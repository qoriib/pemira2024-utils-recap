import { prisma } from "@/services/prisma.service";

export async function POST(req: Request) {
  try {
    if (req.headers.get("x-api-key") !== process.env.VALIDATION_KEY) {
      return new Response(
        JSON.stringify({
          error: "Invalid or missing API key",
        }),
        { status: 401 }
      );
    }

    const recapQuery = await prisma.major.findMany({
      select: {
        abbr: true,
        name: true,
        faculty: true,
        _count: {
          select: {
            voters: true,
          },
        },
        voters: {
          select: {
            validationData: {
              select: {
                id: true,
              },
              distinct: ["id"],
            },
            voteData: {
              select: {
                id: true,
              },
              distinct: ["id"],
            },
          },
        },
      },
    });

    const recapData = recapQuery.map((major) => ({
      major_abbr: major.abbr,
      major_name: major.name,
      faculty: major.faculty,
      total_voters: major._count.voters,
      total_validations: major.voters.reduce(
        (count, voter) => count + voter.validationData.length,
        0
      ),
      total_votes: major.voters.reduce(
        (count, voter) => count + voter.voteData.length,
        0
      ),
    }));

    const sortedRecapData = recapData.sort(
      (a, b) => b.total_votes - a.total_votes
    );

    await prisma.monitoringData.create({
      select: {
        id: true,
      },
      data: {
        content: sortedRecapData,
      },
    });

    return new Response(
      JSON.stringify({
        data: sortedRecapData,
      }),
      { status: 200 }
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan saat memproses data" }),
      { status: 500 }
    );
  }
}
