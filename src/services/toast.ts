import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number; // ms, default: 4000, 0 for persistent
  position?: ToastPosition;
  action?: ToastAction;
  cancel?: { label: string; onClick?: () => void };
  icon?: React.ReactNode;
  dismissible?: boolean;
}

export interface ToastItem extends Required<Omit<ToastOptions, 'title' | 'description' | 'action' | 'cancel' | 'icon'>> {
  id: string;
  message: string;
  title?: string;
  description?: string;
  action?: ToastAction;
  cancel?: { label: string; onClick?: () => void };
  icon?: React.ReactNode;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private defaultPosition: ToastPosition = 'bottom-right';

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = [...this.toasts];
    this.listeners.forEach((listener) => listener(copy));
  }

  public show(message: string, options: ToastOptions = {}): string {
    const id = options.id || Math.random().toString(36).substring(2, 9);
    const type = options.type || 'default';
    const duration = options.duration !== undefined ? options.duration : type === 'loading' ? 0 : 4000;
    const position = options.position || this.defaultPosition;
    const dismissible = options.dismissible !== undefined ? options.dismissible : true;

    // Check if updating existing toast
    const existingIndex = this.toasts.findIndex((t) => t.id === id);

    const toastItem: ToastItem = {
      id,
      message,
      title: options.title,
      description: options.description,
      type,
      duration,
      position,
      action: options.action,
      cancel: options.cancel,
      icon: options.icon,
      dismissible,
      createdAt: Date.now(),
    };

    if (existingIndex > -1) {
      this.toasts[existingIndex] = toastItem;
    } else {
      this.toasts = [...this.toasts, toastItem];
    }

    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public success(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'success' });
  }

  public error(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'error' });
  }

  public warning(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'warning' });
  }

  public info(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'info' });
  }

  public loading(message: string, options?: Omit<ToastOptions, 'type'>): string {
    return this.show(message, { ...options, type: 'loading', duration: 0 });
  }

  /**
   * Automatically tracks promise lifecycle with loading -> success/error states
   */
  public promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    },
    options?: Omit<ToastOptions, 'type'>
  ): Promise<T> {
    const id = this.loading(messages.loading, options);

    return promise
      .then((data) => {
        const msg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
        this.success(msg, { ...options, id, duration: options?.duration || 4000 });
        return data;
      })
      .catch((err) => {
        const msg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
        this.error(msg, { ...options, id, duration: options?.duration || 5000 });
        throw err;
      });
  }

  public dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public dismissAll(): void {
    this.toasts = [];
    this.notify();
  }

  public setDefaultPosition(position: ToastPosition): void {
    this.defaultPosition = position;
  }
}

export const toast = new ToastManager();
export default toast;
