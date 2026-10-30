import { redirect } from 'next/navigation'

// A shared /join/<code> link: confirm the agency on J2 before anyone commits.
export default function JoinCodeRedirect({ params }: { params: { code: string } }) {
  redirect(`/join?code=${encodeURIComponent(params.code.toUpperCase())}`)
}
