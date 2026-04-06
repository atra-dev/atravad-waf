import { connection } from "next/server";
import HomePageClient from "./home-page-client";

export default async function HomePage() {
  await connection();
  return <HomePageClient />;
}
