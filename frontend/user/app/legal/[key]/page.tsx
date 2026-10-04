import type { Metadata } from 'next';
import Link from 'next/link';
import { Markdown } from '../../../components/legal/Markdown';
import { BASE_URL } from '../../../utils/api_endpoints';

interface PublicPolicy {
  key: string;
  title: string;
  version: number;
  body: string;
  published_at: string | null;
}

async function load(key: string, country?: string): Promise<PublicPolicy | null> {
  try {
    const q = country ? `?country=${encodeURIComponent(country)}` : '';
    const res = await fetch(`${BASE_URL}/policies/public/${encodeURIComponent(key)}${q}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as PublicPolicy) : null;
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ key: string }>; searchParams: Promise<{ country?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { key } = await params;
  const { country } = await searchParams;
  const policy = await load(key, country);
  return { title: policy ? `${policy.title} | Amsh` : 'Policy | Amsh' };
}

/** The published text of a policy (Terms, Privacy...), public so it can be linked from sign-up. Edited in the admin portal. */
export default async function LegalPage({ params, searchParams }: Props) {
  const { key } = await params;
  const { country } = await searchParams;
  const policy = await load(key, country);
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="text-sm font-semibold text-[#0066FF] hover:underline">← Amsh</Link>
        {policy ? (
          <article className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{policy.title}</h1>
            <p className="mt-1 text-xs text-gray-500">
              Version {policy.version}
              {policy.published_at ? `, effective ${new Date(policy.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            </p>
            <Markdown source={policy.body} />
          </article>
        ) : (
          <div className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">This policy has not been published yet, or could not be loaded.</div>
        )}
      </div>
    </main>
  );
}
