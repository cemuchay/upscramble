import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast, ToastType } from '../services/toast';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface User {
  username: string;
  email: string;
  role: string;
}

interface AppState {
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // User session state
  user: User | null;
  loginUser: (user: User) => void;
  logoutUser: () => void;

  // Toast / Alerts notification queue
  notifications: Notification[];
  addNotification: (message: string, type?: Notification['type']) => void;
  removeNotification: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme defaults to 'dark' for the premium dark mode default look
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const nextTheme = state.theme === 'light' ? 'dark' : 'light';
          // Synchronize HTML element classes for Tailwind
          if (typeof document !== 'undefined') {
            if (nextTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { theme: nextTheme };
        }),

      // User session initial state
      user: {
        username: 'Developer',
        email: 'dev@vite-template.io',
        role: 'Admin',
      },
      loginUser: (user) => set({ user }),
      logoutUser: () => set({ user: null }),

      // Notification management bridged directly into global toast service
      notifications: [],
      addNotification: (message, type = 'info') => {
        toast.show(message, { type: type as ToastType });
      },
      removeNotification: (id) => {
        toast.dismiss(id);
      },
    }),
    {
      name: 'app_storage',
      // Persist only the theme and user settings
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
      }),
    }
  )
);

export default useStore;
