/**
 * Next.js App Router Architecture, Folder Structure & Production Code Snippets
 * For deployment on Vercel / GitHub for domain: news.pabansubedi.com.np
 */

export const NEXTJS_FOLDER_STRUCTURE = `news-portal-nepal/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx                  # Public layout with Header, Footer, Bikram Sambat Clock, Top Ad
│   │   ├── page.tsx                    # Homepage: Hero Breaking, Trending, Category Grid, Ads
│   │   ├── category/
│   │   │   └── [slug]/
│   │   │       └── page.tsx            # Category Archive (राजनीति, अर्थ, खेलकुद, etc.)
│   │   ├── news/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # Article Detail: TTS Reader, In-article Ad, Comments, Print
│   │   │       └── opengraph-image.tsx # Dynamic Social Media Card generation
│   │   └── search/
│   │       └── page.tsx                # Instant search
│   ├── admin/
│   │   ├── layout.tsx                  # Protected Admin Layout (Role Gatekeeper)
│   │   ├── page.tsx                    # Executive Dashboard Overview & Stats
│   │   ├── posts/
│   │   │   ├── page.tsx                # Post List & Approval Workflow (Draft -> Pending -> Approve)
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # Article Composer with PC Image Upload & Rich Editor
│   │   │   └── edit/[id]/
│   │   │       └── page.tsx            # Article Editor
│   │   ├── ads/
│   │   │   └── page.tsx                # Dynamic Ad Manager (5 placement slots)
│   │   ├── categories/
│   │   │   └── page.tsx                # Taxonomy & Navigation Order Manager
│   │   └── settings/
│   │       └── page.tsx                # Dynamic Site Settings, Logo, Favicon, Watermark
│   ├── api/
│   │   ├── posts/
│   │   │   └── route.ts                # API Route for feed/filtering
│   │   ├── views/
│   │   │   └── [slug]/
│   │   │       └── route.ts            # Atomic View counter increment
│   │   └── ads/
│   │       └── click/
│   │           └── route.ts            # Ad Click Tracker
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx                # Admin/Staff Login
│   │   └── callback/
│   │       └── route.ts                # Supabase OAuth/Magic Link handler
│   ├── globals.css                     # Tailwind CSS & Devanagari typography
│   ├── layout.tsx                      # Root HTML, ThemeProvider, Schema.org LD-JSON
│   └── sitemap.ts                      # Dynamic XML Sitemap generator for Google/SEO
├── components/
│   ├── ui/                             # Button, Modal, Card, Dropdown
│   ├── AdBanner.tsx                    # 5-Zone Monetization Ad component
│   ├── AudioNewsReader.tsx             # Text-to-Speech Player (Nepali/English)
│   ├── BreakingTicker.tsx              # Live scrolling breaking news marquee
│   ├── Header.tsx                      # Top Bar, Bikram Sambat Clock, Logo, Nav
│   ├── Footer.tsx                      # Press Council info, Copyright, Disclaimer
│   ├── ImageUploader.tsx               # Drag & Drop PC image to Supabase Storage
│   └── PrintArticleModal.tsx           # Newspaper-styled Print/PDF preview
├── lib/
│   ├── nepaliDate.ts                   # Bikram Sambat (BS) date conversion & digits
│   └── supabase/
│       ├── client.ts                   # Browser Supabase client
│       ├── server.ts                   # Server-side Next.js Supabase client (cookies)
│       └── middleware.ts               # Session verification & Route Guard
├── types/
│   └── index.ts                        # Unified TypeScript types
├── .env.local                          # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
├── next.config.mjs
├── package.json
└── tailwind.config.ts`;

export const CODE_SNIPPETS = {
  envConfig: `# .env.local for news.pabansubedi.com.np (Production Environment Variables)
# Replace with your actual project credentials from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_publishable_key_here
NEXT_PUBLIC_SITE_URL=https://news.pabansubedi.com.np`,

  supabaseClient: `// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}`,

  supabaseServer: `// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handled in middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handled in middleware
          }
        },
      },
    }
  );
}`,

  publicHomepage: `// app/(public)/page.tsx
import { createClient } from '@/lib/supabase/server';
import { AdBanner } from '@/components/AdBanner';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 60; // Incremental Static Regeneration every 60s

export default async function HomePage() {
  const supabase = createClient();

  // 1. Fetch only Approved & Published articles
  const { data: posts } = await supabase
    .from('posts')
    .select('*, categories(name, slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  // 2. Fetch active banner ads
  const { data: heroAd } = await supabase
    .from('advertisements')
    .select('*')
    .eq('placement_slot', 'below_hero')
    .eq('is_active', true)
    .single();

  const breakingPosts = posts?.filter((p) => p.is_breaking) || [];
  const heroPost = posts?.[0];
  const secondaryPosts = posts?.slice(1, 5) || [];

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Hero Main News */}
      {heroPost && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <Link href={\`/news/\${heroPost.slug}\`} className="group block">
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={heroPost.featured_image}
                  alt={heroPost.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                  priority
                />
                <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
                  {heroPost.categories?.name}
                </span>
              </div>
              <div className="p-6">
                <h1 className="text-3xl font-bold leading-tight group-hover:text-red-600 transition">
                  {heroPost.title}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg line-clamp-2">
                  {heroPost.excerpt}
                </p>
              </div>
            </Link>
          </div>

          {/* Secondary Lead Grid */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {secondaryPosts.map((post) => (
              <Link
                key={post.id}
                href={\`/news/\${post.slug}\`}
                className="flex gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:shadow-md transition"
              >
                <div className="relative w-28 h-20 shrink-0 rounded overflow-hidden">
                  <Image src={post.featured_image} alt={post.title} fill className="object-cover" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm line-clamp-2 hover:text-red-600">
                    {post.title}
                  </h3>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {new Date(post.published_at).toLocaleDateString('ne-NP')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ad Zone: Below Hero Banner */}
      {heroAd && <AdBanner ad={heroAd} />}
    </main>
  );
}`,

  adminLayoutApproval: `// app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check role restriction from users_profile
  const { data: profile } = await supabase
    .from('users_profile')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['super_admin', 'editor', 'reporter'].includes(profile.role)) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">पहुँच अस्वीकृत (Unauthorized)</h1>
        <p className="mt-2 text-slate-600">यो पृष्ठ हेर्न तपाईंसँग आवश्यक अनुमति छैन।</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">
      {/* Admin Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-red-500">नेपाल खबर २४ CMS</h2>
          <p className="text-xs text-slate-400">news.pabansubedi.com.np</p>
        </div>
        <nav className="space-y-2 flex-1">
          <a href="/admin" className="block px-3 py-2 rounded hover:bg-slate-800">ड्यासबोर्ड</a>
          <a href="/admin/posts" className="block px-3 py-2 rounded hover:bg-slate-800">समाचार & स्वीकृति</a>
          {profile.role === 'super_admin' && (
            <>
              <a href="/admin/ads" className="block px-3 py-2 rounded hover:bg-slate-800">विज्ञापन व्यवस्थापन</a>
              <a href="/admin/categories" className="block px-3 py-2 rounded hover:bg-slate-800">क्याटगोरी</a>
              <a href="/admin/settings" className="block px-3 py-2 rounded hover:bg-slate-800">साइट सेटिङ</a>
            </>
          )}
        </nav>
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
          लगइन: <strong className="text-white">{profile.full_name}</strong> ({profile.role})
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}`
};
