import React, { useState } from 'react';
import { SUPABASE_SQL_SCHEMA } from '../lib/sqlSchema';
import { NEXTJS_FOLDER_STRUCTURE, CODE_SNIPPETS } from '../lib/nextjsStructure';
import { Database, Code2, Copy, Check, Download, ArrowLeft, Terminal, Shield, CheckCircle } from 'lucide-react';
import { useNewsApp } from '../lib/store';

export const DocsView: React.FC = () => {
  const { navigateTo } = useNewsApp();
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'news_paban_subedi_supabase_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigateTo('home')}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>गृहपृष्ठमा फर्कनुहोस्</span>
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 rounded-2xl border border-slate-700 shadow-xl">
        <span className="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Architecture & Deployment Blueprint
        </span>
        <h1 className="text-3xl font-extrabold mt-2 tracking-tight">
          Supabase PostgreSQL & Next.js App Router Documentation
        </h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl">
          Complete database schema, Row Level Security (RLS) policies, storage bucket policies, and Next.js App Router codebase ready for deployment on Vercel / GitHub for <strong>news.pabansubedi.com.np</strong>.
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <button
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'SQL Script Copied!' : 'Copy Full Supabase SQL'}</span>
          </button>

          <button
            onClick={handleDownloadSql}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600 flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .sql File</span>
          </button>
        </div>
      </div>

      {/* Quick Setup Checklist */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <span>Vercel + Supabase Deployment Guide</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-red-600">चरण १: Supabase Project</span>
            <p className="text-slate-600 dark:text-slate-300">
              Supabase मा नयाँ Project सिर्जना गर्नुहोस् र SQL Editor मा गएर तलको SQL स्क्रिप्ट Paste गरी Run गर्नुहोस्।
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-blue-600">चरण २: Environment Variables</span>
            <p className="text-slate-600 dark:text-slate-300">
              Vercel मा Project Import गर्दा <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> र <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> राख्नुहोस्।
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-emerald-600">चरण ३: Custom Domain</span>
            <p className="text-slate-600 dark:text-slate-300">
              Vercel Domains मा <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">news.pabansubedi.com.np</code> थप्नुहोस् र CNAME रेकर्ड Vercel तर्फ पोइन्ट गर्नुहोस्।
            </p>
          </div>
        </div>
      </div>

      {/* SQL SCHEMA SECTION */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              १. Supabase PostgreSQL & RLS Migration Schema
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">schema.sql</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-96 scrollbar-thin">
          <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      </div>

      {/* NEXT.JS APP ROUTER ARCHITECTURE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              २. Next.js App Router Structure
            </h3>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto font-mono text-xs text-sky-400">
          <pre>{NEXTJS_FOLDER_STRUCTURE}</pre>
        </div>
      </div>

      {/* NEXT.JS CODE SNIPPETS */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          ३. उत्पादन-स्तरका कोड स्निपेट्स (Production-Ready Code Snippets)
        </h3>

        {/* 1. Supabase Client */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-red-600 dark:text-red-400">
              A. lib/supabase/client.ts (Browser Client)
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(CODE_SNIPPETS.supabaseClient);
                setCopiedSnippet('client');
                setTimeout(() => setCopiedSnippet(null), 2000);
              }}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600"
            >
              {copiedSnippet === 'client' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === 'client' ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto">
            {CODE_SNIPPETS.supabaseClient}
          </pre>
        </div>

        {/* 2. Supabase Server */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-red-600 dark:text-red-400">
              B. lib/supabase/server.ts (Server-side Next.js Cookie Session)
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(CODE_SNIPPETS.supabaseServer);
                setCopiedSnippet('server');
                setTimeout(() => setCopiedSnippet(null), 2000);
              }}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600"
            >
              {copiedSnippet === 'server' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === 'server' ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto">
            {CODE_SNIPPETS.supabaseServer}
          </pre>
        </div>

        {/* 3. Public Homepage */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-red-600 dark:text-red-400">
              C. app/(public)/page.tsx (Public Front-End with Approved Posts Filtering & Ads)
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(CODE_SNIPPETS.publicHomepage);
                setCopiedSnippet('home');
                setTimeout(() => setCopiedSnippet(null), 2000);
              }}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600"
            >
              {copiedSnippet === 'home' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === 'home' ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto">
            {CODE_SNIPPETS.publicHomepage}
          </pre>
        </div>

        {/* 4. Admin Layout */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-red-600 dark:text-red-400">
              D. app/admin/layout.tsx (Role Restriction Gatekeeper & Approval Workflow)
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(CODE_SNIPPETS.adminLayoutApproval);
                setCopiedSnippet('admin');
                setTimeout(() => setCopiedSnippet(null), 2000);
              }}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600"
            >
              {copiedSnippet === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet === 'admin' ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs font-mono overflow-x-auto">
            {CODE_SNIPPETS.adminLayoutApproval}
          </pre>
        </div>
      </div>
    </div>
  );
};
