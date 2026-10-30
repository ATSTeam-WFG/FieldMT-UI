import { redirect } from 'next/navigation'

// The self-serve questionnaire is gone: there is no open sign-up. Old links land on sign-in.
export default function OnboardingPage() {
  redirect('/login')
}
