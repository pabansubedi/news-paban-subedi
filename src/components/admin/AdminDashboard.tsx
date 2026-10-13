import React, { useState } from 'react';
import { useNewsApp } from '../../lib/store';
import { Post, PostStatus, AdPlacementSlot, Category } from '../../types';
import { toNepaliDigits } from '../../lib/nepaliDate';
import { SUPABASE_SQL_SCHEMA } from '../../lib/sqlSchema';
import { NEXTJS_FOLDER_STRUCTURE, CODE_SNIPPETS } from '../../lib/nextjsStructure';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Edit,
  Eye,
  Sliders,
  Megaphone,
  Layers,
  Settings,
  Database,
  Code2,
  Upload,
  Check,
  Copy,
  AlertTriangle,
  Flame,
  Star,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Key,
  Lock,
  Mail,
  Phone
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    currentRole,
    users,
    addUser,
    updateUser,
    deleteUser,
    posts,
    addPost,
    updatePost,
    deletePost,
    changePostStatus,
    ads,
    updateAd,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    siteSettings,
    updateSiteSettings,
    navigateTo
  } = useNewsApp();

  type AdminTab = 'posts' | 'new_post' | 'ads' | 'categories' | 'staff' | 'settings' | 'sql_schema' | 'nextjs_code';
  const [activeTab, setActiveTab] = useState<AdminTab>('posts');

  // Staff Management state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'super_admin' | 'editor' | 'reporter'>('editor');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffBio, setNewStaffBio] = useState('');
  const [staffSuccessMsg, setStaffSuccessMsg] = useState('');

  // Filter for posts
  const [postFilter, setPostFilter] = useState<'all' | PostStatus>('all');
  const [searchPost, setSearchPost] = useState('');

  // Editing existing post
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Form states for Post Composer
  const [postTitle, setPostTitle] = useState('');
  const [postSlug, setPostSlug] = useState('');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategoryId, setPostCategoryId] = useState(categories[0]?.id || '');
  const [postImage, setPostImage] = useState('https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80');
  const [postImageCaption, setPostImageCaption] = useState('');
  const [postIsBreaking, setPostIsBreaking] = useState(false);
  const [postIsFeatured, setPostIsFeatured] = useState(false);
  const [postTags, setPostTags] = useState('नेपाल, समाचार');
  const [formSuccess, setFormSuccess] = useState('');

  // Copy states
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // New Category Modal states
  const [newCatName, setNewCatName] = useState('');
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatColor, setNewCatColor] = useState('#dc2626');

  // Slug generator helper
  const handleTitleChange = (val: string) => {
    setPostTitle(val);
    if (!editingPostId) {
      const generatedSlug = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      setPostSlug(generatedSlug || `nepal-news-${Date.now().toString().slice(-6)}`);
    }
  };

  // PC Image Upload to Base64/DataURL simulation for local preview & Supabase bucket
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'post' | 'logo' | 'logo_dark' | 'favicon' | 'watermark' | string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (target === 'post') setPostImage(result);
        else if (target === 'logo') updateSiteSettings({ logo_url: result });
        else if (target === 'logo_dark') updateSiteSettings({ logo_dark_url: result });
        else if (target === 'favicon') updateSiteSettings({ favicon_url: result });
        else if (target === 'watermark') updateSiteSettings({ watermark_url: result });
        else if (target.startsWith('ad-')) {
          const adId = target.replace('ad-', '');
          updateAd(adId, { image_url: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      return;
    }
    addUser({
      user_id: `usr_${Date.now()}`,
      role: newStaffRole,
      full_name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      phone: newStaffPhone.trim() || undefined,
      bio: newStaffBio.trim() || undefined,
      avatar:
        newStaffRole === 'super_admin'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          : newStaffRole === 'editor'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    });
    setStaffSuccessMsg(`नयाँ ${newStaffRole === 'super_admin' ? 'सुपर एडमिन' : newStaffRole === 'editor' ? 'सम्पादक' : 'संवाददाता'} सफलतापुर्वक थपियो!`);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffBio('');
    setTimeout(() => setStaffSuccessMsg(''), 4000);
  };

  const handleSavePost = (submitStatus: PostStatus) => {
    if (!postTitle.trim() || !postContent.trim()) {
      alert('कृपया शीर्षक र समाचारको मुख्य विवरण भर्नुहोस्।');
      return;
    }

    const tagsArray = postTags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingPostId) {
      updatePost(editingPostId, {
        title: postTitle,
        slug: postSlug,
        excerpt: postExcerpt,
        content: postContent,
        category_id: postCategoryId,
        featured_image: postImage,
        image_caption: postImageCaption,
        is_breaking: postIsBreaking,
        is_featured: postIsFeatured,
        status: submitStatus,
        tags: tagsArray,
        editor_name: currentUser.full_name
      });
      setFormSuccess('समाचार सफलतापूर्वक अपडेट गरियो!');
    } else {
      addPost({
        title: postTitle,
        slug: postSlug,
        excerpt: postExcerpt || postContent.slice(0, 150) + '...',
        content: postContent,
        category_id: postCategoryId,
        featured_image: postImage,
        image_caption: postImageCaption,
        author_id: currentUser.id,
        author_name: currentUser.full_name,
        author_avatar: currentUser.avatar,
        status: submitStatus,
        is_breaking: postIsBreaking,
        is_featured: postIsFeatured,
        read_time_mins: Math.ceil(postContent.split(/\s+/).length / 150) || 3,
        tags: tagsArray,
        published_at: submitStatus === 'published' ? new Date().toISOString() : null
      });
      setFormSuccess(
        submitStatus === 'published'
          ? 'समाचार प्रत्यक्ष प्रकाशित गरियो!'
          : submitStatus === 'pending'
          ? 'समाचार समीक्षा (Review) का लागि पठाइयो!'
          : 'समाचार ड्राफ्टका रूपमा सुरक्षित गरियो!'
      );
    }

    setTimeout(() => {
      setFormSuccess('');
      setActiveTab('posts');
      resetPostForm();
    }, 1500);
  };

  const resetPostForm = () => {
    setEditingPostId(null);
    setPostTitle('');
    setPostSlug('');
    setPostExcerpt('');
    setPostContent('');
    setPostImageCaption('');
    setPostIsBreaking(false);
    setPostIsFeatured(false);
  };

  const handleEditClick = (post: Post) => {
    setEditingPostId(post.id);
    setPostTitle(post.title);
    setPostSlug(post.slug);
    setPostExcerpt(post.excerpt);
    setPostContent(post.content);
    setPostCategoryId(post.category_id);
    setPostImage(post.featured_image);
    setPostImageCaption(post.image_caption || '');
    setPostIsBreaking(post.is_breaking);
    setPostIsFeatured(post.is_featured);
    setPostTags(post.tags?.join(', ') || '');
    setActiveTab('new_post');
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) return;
    addCategory({
      name: newCatName.trim(),
      name_en: newCatEn.trim() || newCatName.trim(),
      slug: newCatSlug.trim().toLowerCase(),
      order_index: categories.length + 1,
      color: newCatColor,
      is_active: true
    });
    setNewCatName('');
    setNewCatEn('');
    setNewCatSlug('');
  };

  // Filtered posts in CMS
  const filteredPosts = posts.filter((p) => {
    const matchesStatus = postFilter === 'all' || p.status === postFilter;
    const matchesSearch =
      !searchPost ||
      p.title.toLowerCase().includes(searchPost.toLowerCase()) ||
      p.author_name.toLowerCase().includes(searchPost.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner / Role Status */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'editor' ? 'Editor' : 'Reporter'}
            </span>
            <span className="text-slate-400 text-xs">news.pabansubedi.com.np</span>
            <span className="text-emerald-400 text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 hidden sm:inline">
              ✓ Supabase Connected
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            News Paban Subedi — समाचार व्यवस्थापन प्रणाली (CMS)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            लगइन: <strong>{currentUser.full_name}</strong> ({currentUser.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              resetPostForm();
              setActiveTab('new_post');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नयाँ समाचार लेख्नुहोस्</span>
          </button>
          <button
            onClick={() => navigateTo('home')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
          >
            लाइभ पोर्टल हेर्नुहोस्
          </button>
        </div>
      </div>

      {/* ADMIN TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'posts'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>समाचार सूची & स्वीकृति ({posts.length})</span>
        </button>

        <button
          onClick={() => {
            resetPostForm();
            setActiveTab('new_post');
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'new_post'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>{editingPostId ? 'समाचार सम्पादन' : 'नयाँ समाचार'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ads')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'ads'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>विज्ञापन व्यवस्थापन ({ads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'categories'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>क्याटगोरी & नेभिगेसन</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'staff'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-purple-500" />
          <span>कर्मचारी तथा सम्पादक ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>साइट सेटिङ & ब्रान्डिङ</span>
        </button>

        <button
          onClick={() => setActiveTab('sql_schema')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'sql_schema'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-500" />
          <span>Supabase SQL & RLS</span>
        </button>

        <button
          onClick={() => setActiveTab('nextjs_code')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'nextjs_code'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4 text-sky-500" />
          <span>Next.js App Router Architecture</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: POSTS & EDITORIAL APPROVAL WORKFLOW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Workflow Explanation Banner */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Editorial Approval Workflow:</strong>
              <p className="mt-0.5">
                १. रिपोर्टर/पत्रकारले समाचार ड्राफ्ट (Draft) वा समीक्षाका लागि पठाउँछन् (Pending Review)।
                २. सम्पादकले संशोधन गर्छन्।
                ३. <strong>Super Admin ले स्वीकृत (Approve) गरेपछि मात्र</strong> समाचार मुख्य पोर्टलमा प्रत्यक्ष देखिन्छ।
              </p>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Status pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'सबै' },
                { id: 'published', label: 'प्रकाशित (Published)' },
                { id: 'pending', label: 'समीक्षाधीन (Pending Review)' },
                { id: 'draft', label: 'ड्राफ्ट (Draft)' },
                { id: 'rejected', label: 'अस्वीकृत (Rejected)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPostFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    postFilter === tab.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchPost}
                onChange={(e) => setSearchPost(e.target.value)}
                placeholder="शीर्षक वा लेखक खोज्नुहोस्..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Posts Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">तस्बिर & शीर्षक</th>
                    <th className="p-3.5">विधा</th>
                    <th className="p-3.5">लेखक / सम्पादक</th>
                    <th className="p-3.5">स्थिति (Status)</th>
                    <th className="p-3.5">भ्युज</th>
                    <th className="p-3.5 text-right">कार्यहरू (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        कुनै समाचार भेटिएन।
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => {
                      const cat = categories.find((c) => c.id === post.category_id);
                      return (
                        <tr key={post.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3.5 max-w-sm">
                            <div className="flex gap-3 items-center">
                              <img
                                src={post.featured_image}
                                alt={post.title}
                                className="w-14 h-10 object-cover rounded shrink-0 bg-slate-200"
                              />
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-red-600 transition">
                                  {post.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                  {post.is_breaking && (
                                    <span className="text-red-600 font-extrabold flex items-center gap-0.5">
                                      <Flame className="w-3 h-3" /> ब्रेकिङ
                                    </span>
                                  )}
                                  <span>{new Date(post.created_at).toLocaleDateString('ne-NP')}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {cat?.name || 'अन्य'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {post.author_name}
                            </div>
                            {post.editor_name && (
                              <div className="text-[10px] text-slate-400">
                                अनुमोदक: {post.editor_name}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            {post.status === 'published' && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> प्रकाशित
                              </span>
                            )}
                            {post.status === 'pending' && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> समीक्षाधीन
                              </span>
                            )}
                            {post.status === 'draft' && (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] inline-flex items-center gap-1">
                                ड्राफ्ट
                              </span>
                            )}
                            {post.status === 'rejected' && (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> अस्वीकृत
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {toNepaliDigits(post.views)}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* APPROVAL WORKFLOW BUTTONS FOR SUPER ADMIN / EDITOR */}
                              {currentRole === 'super_admin' && post.status !== 'published' && (
                                <button
                                  onClick={() => changePostStatus(post.id, 'published', currentUser.full_name)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                                  title="Approve and Publish to Live Site"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>स्वीकृत (Approve)</span>
                                </button>
                              )}

                              {currentRole === 'super_admin' && post.status === 'published' && (
                                <button
                                  onClick={() => changePostStatus(post.id, 'draft')}
                                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold hover:bg-slate-300 transition"
                                  title="Unpublish"
                                >
                                  Unpublish
                                </button>
                              )}

                              {/* View on site */}
                              <button
                                onClick={() => navigateTo('article', post.slug)}
                                className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                                title="हेर्नुहोस्"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit post */}
                              <button
                                onClick={() => handleEditClick(post)}
                                className="p-1.5 rounded bg-blue-100 dark:bg-blue-950/50 hover:bg-blue-200 text-blue-700 dark:text-blue-300 transition"
                                title="सम्पादन"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete post (Super Admin only) */}
                              {currentRole === 'super_admin' && (
                                <button
                                  onClick={() => {
                                    if (confirm('के तपाईं यो समाचार मेटाउन निश्चित हुनुहुन्छ?')) {
                                      deletePost(post.id);
                                    }
                                  }}
                                  className="p-1.5 rounded bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 transition"
                                  title="मेटाउनुहोस्"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: RICH ARTICLE COMPOSER & PC IMAGE UPLOAD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'new_post' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingPostId ? 'समाचार सम्पादन गर्नुहोस्' : 'नयाँ समाचार सिर्जना गर्नुहोस्'}
            </h2>
            {formSuccess && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-bold">
                ✓ {formSuccess}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                समाचारको मुख्य शीर्षक *
              </label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="उदा: काठमाडौँमा डिजिटल नेपाल सम्बन्धी अन्तर्राष्ट्रिय सम्मेलन सम्पन्न..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Slug & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  URL Slug (Permanent Link)
                </label>
                <input
                  type="text"
                  value={postSlug}
                  onChange={(e) => setPostSlug(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  विधा (Category) *
                </label>
                <select
                  value={postCategoryId}
                  onChange={(e) => setPostCategoryId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.name_en})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PC IMAGE UPLOAD & PREVIEW */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                मुख्य तस्बिर अपलोड (PC Image Upload to Supabase Storage Bucket `news-images`)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-44 h-28 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600">
                  <img src={postImage} alt="Preview" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, 'post')}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    JPG, PNG वा WebP फाइल चयन गर्नुहोस्। PC बाट सिधै अपलोड हुन्छ।
                  </p>
                  <input
                    type="text"
                    value={postImageCaption}
                    onChange={(e) => setPostImageCaption(e.target.value)}
                    placeholder="तस्बिरको क्याप्सन वा स्रोत (उदा: फाइल तस्बिर / रासस)"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                छोटो सारांश (Excerpt / Sub-heading)
              </label>
              <textarea
                value={postExcerpt}
                onChange={(e) => setPostExcerpt(e.target.value)}
                rows={2}
                placeholder="समाचारको संक्षेपमा १-२ वाक्य..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Content Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                समाचारको पूर्ण विवरण (Article Content) *
              </label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={10}
                placeholder="विस्तृत समाचार यहाँ लेख्नुहोस्..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600 leading-relaxed font-normal"
              />
            </div>

            {/* Tags & Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  ट्यागहरू (Tags, comma separated)
                </label>
                <input
                  type="text"
                  value={postTags}
                  onChange={(e) => setPostTags(e.target.value)}
                  placeholder="काठमाडौँ, राजनीति, बजेट"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={postIsBreaking}
                    onChange={(e) => setPostIsBreaking(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span className="flex items-center gap-1 text-red-600">
                    <Flame className="w-4 h-4" /> ब्रेकिङ समाचार
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={postIsFeatured}
                    onChange={(e) => setPostIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded"
                  />
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="w-4 h-4" /> मुख्य फिचर
                  </span>
                </label>
              </div>
            </div>

            {/* ACTION BUTTONS BASED ON USER ROLE */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSavePost('draft')}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                ड्राफ्ट सुरक्षित गर्नुहोस् (Save Draft)
              </button>

              <button
                type="button"
                onClick={() => handleSavePost('pending')}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>समीक्षाका लागि पेश गर्नुहोस् (Submit for Review)</span>
              </button>

              {currentRole === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => handleSavePost('published')}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>स्वीकृत & प्रत्यक्ष प्रकाशित गर्नुहोस् (Approve & Publish)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ADVERTISING & MONETIZATION MANAGER (5 ZONES) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                ५ वटा मोनेटाइजेसन विज्ञापन क्षेत्रहरू (5 Placement Zones)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                प्रत्येक विज्ञापनका लागि PC बाट ब्यानर तस्बिर अपलोड गर्नुहोस् वा Google AdSense / HTML स्क्रिप्ट कोड प्रयोग गर्नुहोस्।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ads.map((ad) => {
              const slotLabels: Record<AdPlacementSlot, string> = {
                header_top: 'स्थान १: Header Top Banner (728x90)',
                below_hero: 'स्थान २: Below Main Breaking News / Hero Section',
                sidebar_top: 'स्थान ३: Sidebar Top Box (300x250)',
                in_article: 'स्थान ४: Inside Article Detail Page (Between paragraphs)',
                sticky_footer: 'स्थान ५: Sticky Bottom Footer Banner'
              };

              return (
                <div
                  key={ad.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded">
                      {slotLabels[ad.placement_slot]}
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Dynamic Expiration Status Indicator */}
                      {(() => {
                        const now = new Date();
                        const isExpired = ad.end_date && new Date(ad.end_date + 'T23:59:59') < now;
                        const isScheduled = ad.start_date && new Date(ad.start_date) > now;
                        if (!ad.is_active) {
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              निष्क्रिय (Inactive)
                            </span>
                          );
                        }
                        if (isExpired) {
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                              म्याद सकिएको (Expired)
                            </span>
                          );
                        }
                        if (isScheduled) {
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                              सुरु हुन बाँकी (Scheduled)
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                            सक्रिय (Live Active)
                          </span>
                        );
                      })()}

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={ad.is_active}
                          onChange={(e) => updateAd(ad.id, { is_active: e.target.checked })}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                        <span>{ad.is_active ? 'सक्रिय' : 'बन्द'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Title & Advertiser */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">विज्ञापन शीर्षक / विज्ञापनदाता</label>
                    <input
                      type="text"
                      value={ad.title}
                      onChange={(e) => updateAd(ad.id, { title: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* PC Banner Image Upload & Direct Image URL */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      PC बाट तस्बिर अपलोड वा ब्यानर पूर्वावलोकन
                    </label>
                    <div className="h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, `ad-${ad.id}`)}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer"
                      />
                      <input
                        type="text"
                        value={ad.image_url}
                        onChange={(e) => updateAd(ad.id, { image_url: e.target.value })}
                        placeholder="वा ब्यानर Image URL टाँस्नुहोस्"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Redirect link */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">पुनर्निर्देशन लिङ्क (Redirect URL)</label>
                    <input
                      type="text"
                      value={ad.redirect_url}
                      onChange={(e) => updateAd(ad.id, { redirect_url: e.target.value })}
                      placeholder="https://client-website.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Google AdSense / HTML Script Code */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Google AdSense / Custom HTML कोड (वैकल्पिक)
                    </label>
                    <textarea
                      value={ad.script_code || ''}
                      onChange={(e) => updateAd(ad.id, { script_code: e.target.value })}
                      rows={2}
                      placeholder="<script async src='...'></script>"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Start & Expiry Date Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">सुरु मिति (Start Date)</label>
                      <input
                        type="date"
                        value={ad.start_date || ''}
                        onChange={(e) => updateAd(ad.id, { start_date: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">अन्तिम मिति (Expiry Date)</label>
                      <input
                        type="date"
                        value={ad.end_date || ''}
                        onChange={(e) => updateAd(ad.id, { end_date: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>इम्प्रिसन: <strong>{toNepaliDigits(ad.views_count)}</strong></span>
                    <span>क्लिकहरू: <strong className="text-red-600">{toNepaliDigits(ad.clicks_count)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: CATEGORIES & NAVIGATION REORDER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Add Category Form */}
          <div className="md:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              नयाँ विधा (Category) थप्नुहोस्
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">नेपाली नाम *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="उदा: प्रदेश विशेष, साहित्य"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">English Name</label>
                <input
                  type="text"
                  value={newCatEn}
                  onChange={(e) => setNewCatEn(e.target.value)}
                  placeholder="e.g. Literature"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">URL Slug *</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="e.g. literature"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">रङ (Color Theme)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-8 rounded border"
                  />
                  <span className="text-xs font-mono text-slate-500">{newCatColor}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
              >
                विधा थप्नुहोस् (Add Category)
              </button>
            </form>
          </div>

          {/* Categories List & Reordering */}
          <div className="md:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              सक्रिय विधाहरू (Navigation Bar Order)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((cat, index) => (
                <div key={cat.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color || '#dc2626' }}></span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {cat.name} ({cat.name_en})
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">/{cat.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.is_active}
                        onChange={(e) => updateCategory(cat.id, { is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span>सक्रिय</span>
                    </label>

                    {currentRole === 'super_admin' && (
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: STAFF & EDITORS (Admin, Editor, Reporter Role Management) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Header & Role Capabilities Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>१. सुपर एडमिन (Super Admin)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                सम्पूर्ण नियन्त्रण: साइट सेटिङ, लोगो/फेभिकन, विज्ञापन, कर्मचारीको पद हेरफेर, र सबै समाचार अन्तिम प्रकाशन (Publish) वा हटाउने।
              </p>
              <div className="text-[11px] font-semibold text-red-700 dark:text-red-300">
                संख्या: {toNepaliDigits(users.filter((u) => u.role === 'super_admin').length)} जना
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <Edit className="w-5 h-5" />
                <span>२. समाचार सम्पादक (Editor)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                सम्पादकीय अधिकार: रिपोर्टरहरूले पेस गरेका समाचारहरूको समीक्षा (Review), भाषा/तथ्य संशोधन, क्याटागोरी व्यवस्थापन, र समाचार अनुमोदन।
              </p>
              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                संख्या: {toNepaliDigits(users.filter((u) => u.role === 'editor').length)} जना
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <FileText className="w-5 h-5" />
                <span>३. संवाददाता/रिपोर्टर (Reporter)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                लेखन अधिकार: फिल्डबाट समाचार लेख्ने, तस्बिर अपलोड गर्ने, ड्राफ्ट सुरक्षित गर्ने र सम्पादकलाई समीक्षाका लागि पेस गर्ने (Pending)।
              </p>
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                संख्या: {toNepaliDigits(users.filter((u) => u.role === 'reporter').length)} जना
              </div>
            </div>
          </div>

          {/* Supabase Real Authentication Guide Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Supabase मा नयाँ Admin वा Editor कसरी बनाउने? (Production Auth Guide)</span>
              </h4>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-800">
                Database: users_profile + auth.users
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 pt-1">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <strong className="text-amber-300 font-semibold">विधि १: Supabase Dashboard मार्फत</strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>Supabase मा जानुहोस् &gt; <strong>Authentication &gt; Users</strong> मा <em>"Add user"</em> गर्नुहोस् (इमेल/पासवर्ड)।</li>
                  <li>त्यसपछि <strong>Table Editor &gt; public.users_profile</strong> मा उक्त प्रयोगकर्ताको <code>role</code> कोलमलाई <code>super_admin</code> वा <code>editor</code> बनाउनुहोस्।</li>
                </ol>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <strong className="text-emerald-300 font-semibold">विधि २: SQL Editor मा १ क्लिक क्वेरी</strong>
                <p className="text-[11px] text-slate-300">
                  Supabase <strong>SQL Editor</strong> मा गएर सम्बन्धित प्रयोगकर्ताको इमेल अनुसार यो क्वेरी चलाउनुहोस्:
                </p>
                <pre className="p-2 rounded bg-slate-900 text-emerald-300 font-mono text-[10px] overflow-x-auto">
{`UPDATE public.users_profile
SET role = 'editor' -- वा 'super_admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'editor@pabansubedi.com.np');`}
                </pre>
              </div>
            </div>
          </div>

          {/* Add Staff Form & Existing Staff Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <UserPlus className="w-5 h-5 text-red-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  नयाँ कर्मचारी/सम्पादक दर्ता
                </h4>
              </div>

              {staffSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{staffSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleAddStaff} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    पूरा नाम (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="उदा: सुवास नेपाल"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    इमेल ठेगाना (Email Address) *
                  </label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="उदा: editor2@pabansubedi.com.np"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    पद / भूमिका (Role) *
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                  >
                    <option value="editor">समाचार सम्पादक (Editor)</option>
                    <option value="reporter">संवाददाता (Reporter)</option>
                    <option value="super_admin">सुपर एडमिन (Super Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    सम्पर्क फोन (Phone Number)
                  </label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="+977-9800000000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    संक्षिप्त बायो / ब्युरो (Bio / Bureau)
                  </label>
                  <input
                    type="text"
                    value={newStaffBio}
                    onChange={(e) => setNewStaffBio(e.target.value)}
                    placeholder="उदा: वरिष्ठ उपसम्पादक, राष्ट्रिय समाचार ब्युरो"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>कर्मचारी थप्नुहोस् (Add Staff)</span>
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <span>सक्रिय कर्मचारी तथा सम्पादक सूची ({toNepaliDigits(users.length)})</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  एडमिनले सिधै रोल फेर्न सक्छन्
                </span>
              </div>

              <div className="space-y-3">
                {users.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={staff.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={staff.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-red-500/20 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                            {staff.full_name}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              staff.role === 'super_admin'
                                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                : staff.role === 'editor'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {staff.role === 'super_admin'
                              ? 'सुपर एडमिन'
                              : staff.role === 'editor'
                              ? 'समाचार सम्पादक'
                              : 'संवाददाता'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{staff.email}</span>
                          </span>
                          {staff.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{staff.phone}</span>
                            </span>
                          )}
                        </div>
                        {staff.bio && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                            {staff.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                      {/* Change Role Dropdown */}
                      <select
                        value={staff.role}
                        onChange={(e) => updateUser(staff.id, { role: e.target.value as any })}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold cursor-pointer outline-none"
                      >
                        <option value="super_admin">सुपर एडमिन</option>
                        <option value="editor">सम्पादक</option>
                        <option value="reporter">संवाददाता</option>
                      </select>

                      {/* Delete button (cannot delete main admin) */}
                      {staff.role !== 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`के तपाईं "${staff.full_name}" लाई हटाउन निश्चित हुनुहुन्छ?`)) {
                              deleteUser(staff.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950 transition cursor-pointer"
                          title="हटाउनुहोस्"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: SITE SETTINGS & BRANDING (PC Image Upload for Logo/Favicon) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            साइट सेटिङ, ब्रान्डिङ & सम्पर्क विवरण (Live Dynamic Settings)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                साइटको नाम (Site Title)
              </label>
              <input
                type="text"
                value={siteSettings.site_title}
                onChange={(e) => updateSiteSettings({ site_title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                नारा (Tagline)
              </label>
              <input
                type="text"
                value={siteSettings.tagline}
                onChange={(e) => updateSiteSettings({ tagline: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                सबडोमेन (Target Subdomain)
              </label>
              <input
                type="text"
                value={siteSettings.subdomain}
                onChange={(e) => updateSiteSettings({ subdomain: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                प्रधान सम्पादक (Editor in Chief)
              </label>
              <input
                type="text"
                value={siteSettings.editor_in_chief}
                onChange={(e) => updateSiteSettings({ editor_in_chief: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            {/* FOOTER CONTACT & ADDRESS FIELDS (Admin Editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                कार्यालय ठेगाना (Office Address) *
              </label>
              <input
                type="text"
                value={siteSettings.office_address || ''}
                onChange={(e) => updateSiteSettings({ office_address: e.target.value })}
                placeholder="उदा: अनामनगर, काठमाडौँ, नेपाल"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                सम्पर्क फोन नं (Contact Phone Numbers) *
              </label>
              <input
                type="text"
                value={siteSettings.contact_phone || ''}
                onChange={(e) => updateSiteSettings({ contact_phone: e.target.value })}
                placeholder="उदा: +977-1-4400000, 9800000000"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                सम्पर्क इमेल (Contact Email) *
              </label>
              <input
                type="email"
                value={siteSettings.contact_email || ''}
                onChange={(e) => updateSiteSettings({ contact_email: e.target.value })}
                placeholder="pabansubedi128@gmail.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                प्रेस काउन्सिल दर्ता नं (Press Council Reg No)
              </label>
              <input
                type="text"
                value={siteSettings.press_council_reg_no || ''}
                onChange={(e) => updateSiteSettings({ press_council_reg_no: e.target.value })}
                placeholder="१२८४/०८०-८१"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                सूचना विभाग दर्ता नं (Information Dept Reg No)
              </label>
              <input
                type="text"
                value={siteSettings.information_dept_reg_no || ''}
                onChange={(e) => updateSiteSettings({ information_dept_reg_no: e.target.value })}
                placeholder="३५६२/०८०-८१"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                फेसबुक लिङ्क (Facebook URL)
              </label>
              <input
                type="text"
                value={siteSettings.facebook_url || ''}
                onChange={(e) => updateSiteSettings({ facebook_url: e.target.value })}
                placeholder="https://facebook.com/newspabansubedi"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                ट्विटर / X लिङ्क (Twitter URL)
              </label>
              <input
                type="text"
                value={siteSettings.twitter_url || ''}
                onChange={(e) => updateSiteSettings({ twitter_url: e.target.value })}
                placeholder="https://twitter.com/newspabansubedi"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                युट्युब च्यानल (YouTube URL)
              </label>
              <input
                type="text"
                value={siteSettings.youtube_url || ''}
                onChange={(e) => updateSiteSettings({ youtube_url: e.target.value })}
                placeholder="https://youtube.com/@newspabansubedi"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                साइट तथा फुटरको छोटो विवरण (Meta & Footer Description)
              </label>
              <textarea
                value={siteSettings.meta_description || ''}
                onChange={(e) => updateSiteSettings({ meta_description: e.target.value })}
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            {/* PC LOGO UPLOADS */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                साइट लोगो - लाइट मोड (Logo Light Mode)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileUpload(e, 'logo')}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer"
                />
                <input
                  type="text"
                  value={siteSettings.logo_url || ''}
                  onChange={(e) => updateSiteSettings({ logo_url: e.target.value })}
                  placeholder="वा लोगो URL टाँस्नुहोस्"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              {siteSettings.logo_url && (
                <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-center">
                  <img src={siteSettings.logo_url} alt="Logo" className="h-10 object-contain" />
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                साइट लोगो - डार्क मोड (Logo Dark Mode)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileUpload(e, 'logo_dark')}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer"
                />
                <input
                  type="text"
                  value={siteSettings.logo_dark_url || ''}
                  onChange={(e) => updateSiteSettings({ logo_dark_url: e.target.value })}
                  placeholder="वा डार्क लोगो URL टाँस्नुहोस्"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              {siteSettings.logo_dark_url && (
                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-center">
                  <img src={siteSettings.logo_dark_url} alt="Logo Dark" className="h-10 object-contain" />
                </div>
              )}
            </div>

            {/* PC FAVICON UPLOAD */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                ब्राउजर फेभिकन (Browser Favicon Upload)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileUpload(e, 'favicon')}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer"
                />
                <input
                  type="text"
                  value={siteSettings.favicon_url || ''}
                  onChange={(e) => updateSiteSettings({ favicon_url: e.target.value })}
                  placeholder="वा फेभिकन URL टाँस्नुहोस्"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              {siteSettings.favicon_url && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  <img src={siteSettings.favicon_url} alt="Favicon" className="w-6 h-6 object-contain rounded" />
                  <span>सक्रिय फेभिकन (Active Favicon - ट्याब आइकन तुरुन्तै अपडेट हुन्छ)</span>
                </div>
              )}
            </div>

            {/* PC WATERMARK UPLOAD */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                तस्बिर वाटरमार्क (Photo Watermark Upload)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileUpload(e, 'watermark')}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white cursor-pointer"
                />
                <input
                  type="text"
                  value={siteSettings.watermark_url || ''}
                  onChange={(e) => updateSiteSettings({ watermark_url: e.target.value })}
                  placeholder="वा वाटरमार्क URL टाँस्नुहोस्"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              {siteSettings.watermark_url && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  <img src={siteSettings.watermark_url} alt="Watermark" className="h-6 object-contain" />
                  <span>सक्रिय वाटरमार्क (Active Watermark)</span>
                </div>
              )}
            </div>

            {/* Breaking news ticker control & Speed Adjustments */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    ताजा अपडेट टिकर कन्ट्रोल (Live Breaking News Ticker)
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    माउस राख्दा वा छुँदा टिकर स्वतः रोकिन्छ (Pause on Hover) ताकि पाठकले सहजै पढ्न र क्लिक गर्न सकुन्।
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={siteSettings.is_ticker_active}
                    onChange={(e) => updateSiteSettings({ is_ticker_active: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span>टिकर अन/अफ (Active)</span>
                </label>
              </div>

              {/* Ticker Speed Configuration */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    टिकर गति / स्पिड (Scrolling Pace)
                  </span>
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                    {siteSettings.ticker_speed || 85} सेकेन्ड (
                    {(siteSettings.ticker_speed || 85) >= 100
                      ? 'धीमा / बिस्तारै'
                      : (siteSettings.ticker_speed || 85) >= 75
                      ? 'सन्तुलित / उत्तम'
                      : (siteSettings.ticker_speed || 85) >= 55
                      ? 'मध्यम'
                      : 'छिटो'}
                    )
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSiteSettings({ ticker_speed: 110 })}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border cursor-pointer transition ${
                      (siteSettings.ticker_speed || 85) === 110
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    🐢 बिस्तारै (110s)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSiteSettings({ ticker_speed: 85 })}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border cursor-pointer transition ${
                      (siteSettings.ticker_speed || 85) === 85
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    ⭐ सन्तुलित (85s)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSiteSettings({ ticker_speed: 65 })}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border cursor-pointer transition ${
                      (siteSettings.ticker_speed || 85) === 65
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    🚶 मध्यम (65s)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSiteSettings({ ticker_speed: 45 })}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border cursor-pointer transition ${
                      (siteSettings.ticker_speed || 85) === 45
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    ⚡ छिटो (45s)
                  </button>
                </div>

                {/* Fine Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="35"
                    max="140"
                    step="5"
                    value={siteSettings.ticker_speed || 85}
                    onChange={(e) => updateSiteSettings({ ticker_speed: parseInt(e.target.value, 10) })}
                    className="w-full accent-red-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>छिटो (३५s)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">८५s (सिफारिस गरिएको स्ट्यान्डर्ड)</span>
                    <span>एकदम शान्त/बिस्तारै (१४०s)</span>
                  </div>
                </div>
              </div>

              {/* Custom Headline text */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  थप मुख्य न्युज हेडलाइन (Custom Additional Headline - ऐच्छिक)
                </label>
                <input
                  type="text"
                  value={siteSettings.breaking_news_ticker}
                  onChange={(e) => updateSiteSettings({ breaking_news_ticker: e.target.value })}
                  placeholder="ताजा अपडेट हेडलाइन..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: SUPABASE SQL SCHEMA & RLS POLICIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sql_schema' && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>Supabase PostgreSQL Schema & Row Level Security (RLS)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                यो SQL स्क्रिप्ट सिधै Supabase Dashboard &gt; SQL Editor मा पेस्ट गरेर रन (Run) गर्नुहोस्।
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2500);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSql ? 'कपि भयो!' : 'Copy Entire SQL Script'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[500px] scrollbar-thin">
            <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: NEXT.JS APP ROUTER ARCHITECTURE & CODE SNIPPETS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'nextjs_code' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Next.js App Router Folder Architecture (news.pabansubedi.com.np)
            </h3>
            <p className="text-xs text-slate-500">
              Vercel / GitHub मा उत्पादन तहमा डिप्लोय गर्नका लागि संरचना:
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-emerald-400 font-mono text-xs">
              <pre>{NEXTJS_FOLDER_STRUCTURE}</pre>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Working Code Snippets:
            </h4>

            {/* Supabase Client */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-600 dark:text-red-400">
                  १. Supabase Client Setup (lib/supabase/client.ts)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(CODE_SNIPPETS.supabaseClient);
                    setCopiedSnippet('client');
                    setTimeout(() => setCopiedSnippet(null), 2000);
                  }}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-white"
                >
                  {copiedSnippet === 'client' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'client' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {CODE_SNIPPETS.supabaseClient}
              </pre>
            </div>

            {/* Public Homepage with Ads & Approved Posts */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-600 dark:text-red-400">
                  २. Public Homepage with Ads & Approved Posts (app/(public)/page.tsx)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(CODE_SNIPPETS.publicHomepage);
                    setCopiedSnippet('home');
                    setTimeout(() => setCopiedSnippet(null), 2000);
                  }}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-white"
                >
                  {copiedSnippet === 'home' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'home' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {CODE_SNIPPETS.publicHomepage}
              </pre>
            </div>

            {/* Admin Dashboard Layout & Role Restriction */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-600 dark:text-red-400">
                  ३. Admin Dashboard Layout & Approval Gatekeeper (app/admin/layout.tsx)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(CODE_SNIPPETS.adminLayoutApproval);
                    setCopiedSnippet('admin');
                    setTimeout(() => setCopiedSnippet(null), 2000);
                  }}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-white"
                >
                  {copiedSnippet === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'admin' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {CODE_SNIPPETS.adminLayoutApproval}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
