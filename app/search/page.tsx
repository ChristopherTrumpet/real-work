import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<Record<string, string>> }

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const qs = new URLSearchParams(params).toString()
  redirect(qs ? `/library?${qs}` : '/library')
}
