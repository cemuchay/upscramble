import React, { useState } from 'react';
import { 
  Users, 
  Activity, 
  Clock, 
  Cpu, 
  Plus, 
  RefreshCw, 
  UserCheck, 
  Send, 
  Terminal, 
  Trash2,
  Lock,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useDashboardData, usePosts, useCreatePost } from '../hooks/useQueries';

export default function Dashboard() {
  const { user, loginUser, logoutUser, addNotification } = useStore();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardData();
  const { data: posts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = usePosts();
  const createPostMutation = useCreatePost();

  // Form states for creating a post
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      addNotification('Title and body are required', 'warning');
      return;
    }

    createPostMutation.mutate(
      { title, body },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          addNotification('Post successfully published!', 'success');
        },
        onError: (err: any) => {
          addNotification(`Failed to create post: ${err.message}`, 'error');
        },
      }
    );
  };

  const handleSimulateLogin = () => {
    loginUser({
      username: 'ViteMaster',
      email: 'master@vite.dev',
      role: 'Superadmin'
    });
    addNotification('Logged in as ViteMaster', 'success');
  };

  const handleSimulateLogout = () => {
    logoutUser();
    addNotification('Logged out successfully', 'info');
  };

  const handleTriggerToast = (type: 'info' | 'success' | 'warning' | 'error') => {
    addNotification(`This is a test ${type} notification!`, type);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Hero section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/10 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Welcome back, {user ? user.username : 'Guest'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {user 
              ? `Authorized as ${user.role} — ${user.email}` 
              : 'Sign in to access advanced template settings and testing interfaces.'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleSimulateLogout}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleSimulateLogin}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign In (Demo)
            </button>
          )}
          <button
            onClick={() => {
              refetchStats();
              refetchPosts();
              addNotification('Data synchronizing...', 'info');
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Stats */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {statsLoading ? <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : stats?.usersCount}
          </div>
          <p className="text-[10px] text-emerald-500 font-medium mt-1">+12% from yesterday</p>
        </div>

        {/* Requests Stats */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">API Requests</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {statsLoading ? <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : (stats?.requestsCount ?? 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-emerald-500 font-medium mt-1">Live requests stream</p>
        </div>

        {/* Uptime Stats */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">System Uptime</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {statsLoading ? <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : stats?.uptime}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">AWS us-east cluster</p>
        </div>

        {/* System Load Stats */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Server Load</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {statsLoading ? <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" /> : stats?.systemLoad}
          </div>
          <p className="text-[10px] text-indigo-500 font-medium mt-1">Healthy conditions</p>
        </div>
      </div>

      {/* 3. Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Create Post & Zustand Management (5 Columns) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Post Form */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Send className="w-4.5 h-4.5 text-indigo-500" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400">Publish Post</h2>
            </div>
            
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-medium text-slate-400 mb-1.5">Post Title</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="body" className="block text-xs font-medium text-slate-400 mb-1.5">Content Body</label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your article details here..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={createPostMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {createPostMutation.isPending ? 'Publishing...' : 'Add to Collection'}
              </button>
            </form>
          </div>

          {/* State Playgrounds */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Terminal className="w-4.5 h-4.5 text-purple-500" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400">Zustand Playground</h2>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test global notifications queue. Click a button to trigger alert states.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTriggerToast('info')}
                className="py-2 text-xs font-medium border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500 rounded-xl transition-all"
              >
                Trigger Info
              </button>
              <button
                onClick={() => handleTriggerToast('success')}
                className="py-2 text-xs font-medium border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 rounded-xl transition-all"
              >
                Trigger Success
              </button>
              <button
                onClick={() => handleTriggerToast('warning')}
                className="py-2 text-xs font-medium border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 rounded-xl transition-all"
              >
                Trigger Warning
              </button>
              <button
                onClick={() => handleTriggerToast('error')}
                className="py-2 text-xs font-medium border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all"
              >
                Trigger Error
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Feed (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400">Posts Stream (TanStack Query)</h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">Live Sync</span>
          </div>

          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-xl space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : postsError ? (
            <div className="p-6 text-center border border-rose-500/10 bg-rose-500/5 rounded-2xl">
              <p className="text-sm text-rose-500">Error rendering feed: {postsError.message}</p>
              <button
                onClick={() => refetchPosts()}
                className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 border border-rose-500/25 rounded-lg transition-colors"
              >
                Retry Request
              </button>
            </div>
          ) : !Array.isArray(posts) || posts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-sm text-slate-400">No posts available. Submit the form to publish one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article 
                  key={post.id} 
                  className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                >
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 capitalize">{post.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{post.body}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                    <span>ID: {post.id}</span>
                    <span className="text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 px-2 py-0.5 rounded font-mono">Cached</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
