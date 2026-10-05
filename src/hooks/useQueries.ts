import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Interface for mock/server data
export interface Post {
  id: number;
  title: string;
  body: string;
  userId?: number;
}

export interface DashboardStats {
  usersCount: number;
  requestsCount: number;
  uptime: string;
  systemLoad: string;
}

// 1. Fetching hook: Get list of posts
export function usePosts() {
  return useQuery<Post[], Error>({
    queryKey: ['posts'],
    queryFn: async () => {
      try {
        const response = await api.get<Post[]>('/posts');
        return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
      } catch (err) {
        console.warn('Backend server posts fetch failed, trying JSONPlaceholder fallback...');
        const response = await api.get<Post[]>('https://jsonplaceholder.typicode.com/posts');
        return Array.isArray(response.data) ? response.data.slice(0, 5) : [];
      }
    },
    staleTime: 30000, // 30 seconds cache fresh time
  });
}

// 2. Fetching hook: Get system/dashboard statistics
export function useDashboardData() {
  return useQuery<DashboardStats, Error>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const response = await api.get<DashboardStats>('/stats');
        return response.data;
      } catch (err) {
        // Fallback mock statistics if server is offline or not installed
        return {
          usersCount: 1420,
          requestsCount: 48920,
          uptime: '99.98%',
          systemLoad: '12%',
        };
      }
    },
    refetchInterval: 15000, // Auto-refetch every 15 seconds
  });
}

// 3. Mutation hook: Create a new post
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPost: Omit<Post, 'id'>) => {
      // Try local backend first
      try {
        const response = await api.post<Post>('/posts', newPost);
        return response.data;
      } catch (err) {
        // Fallback to JSONPlaceholder
        const response = await api.post<Post>('https://jsonplaceholder.typicode.com/posts', newPost);
        return response.data;
      }
    },
    onSuccess: (data) => {
      // Optimistically update or invalidate the query cache
      queryClient.setQueryData<Post[]>(['posts'], (oldPosts) => {
        if (!oldPosts) return [data];
        return [data, ...oldPosts];
      });
      
      // Force background refetch to ensure alignment
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
