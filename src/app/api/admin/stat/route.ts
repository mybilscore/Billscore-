// app/api/admin/stats/route.ts
import {
  getNumberOfBuss,
  getNumberOfProducts,
  getNumberOfUsers,
  getNumberOfSubUsers,
} from "~/lib/queries/counters";

export async function GET() {
  const [totalBusinesses, totalUsers, activeSubscriptions, totalProducts] =
    await Promise.all([
      getNumberOfBuss(),
      getNumberOfUsers(),
      getNumberOfSubUsers(),
      getNumberOfProducts(),
    ]);

  return Response.json({
    totalBusinesses,
    totalUsers,
    activeSubscriptions,
    totalProducts,
  });
}
