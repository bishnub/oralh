import BookingPage from "./BookingPage";

type BookPageProps = {
  searchParams: Promise<{
    lang?: string;
  }>;
};

export default async function BookPage({
  searchParams,
}: BookPageProps) {
  const params = await searchParams;

  const language: "en" | "ne" =
    params.lang === "ne" ? "ne" : "en";

  return <BookingPage language={language} />;
}