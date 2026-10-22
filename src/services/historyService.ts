import { PageSession } from '../types';

const STORAGE_KEY = 'gate_multi_qr_sessions_v1';

export class HistoryService {
  /**
   * Loads all saved scan sessions from LocalStorage
   */
  static getSessions(): PageSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (err) {
      console.warn('Failed to load sessions from LocalStorage:', err);
      return [];
    }
  }

  /**
   * Saves or updates a session
   */
  static saveSession(session: PageSession): void {
    try {
      const sessions = this.getSessions();
      const existingIdx = sessions.findIndex((s) => s.id === session.id);

      if (existingIdx >= 0) {
        sessions[existingIdx] = session;
      } else {
        // Prepend new session
        sessions.unshift(session);
      }

      // Limit to last 30 sessions to preserve storage space
      const trimmed = sessions.slice(0, 30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Failed to save session to LocalStorage:', err);
    }
  }

  /**
   * Deletes a session by ID
   */
  static deleteSession(sessionId: string): void {
    try {
      const sessions = this.getSessions().filter((s) => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.warn('Failed to delete session from LocalStorage:', err);
    }
  }

  /**
   * Clears all session history
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear LocalStorage history:', err);
    }
  }

  /**
   * Creates a compact thumbnail from a canvas to save with the session metadata
   */
  static createThumbnail(canvas: HTMLCanvasElement, maxDim = 160): string | undefined {
    try {
      const scale = maxDim / Math.max(canvas.width, canvas.height);
      const thumbW = Math.max(20, Math.round(canvas.width * scale));
      const thumbH = Math.max(20, Math.round(canvas.height * scale));

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = thumbW;
      thumbCanvas.height = thumbH;
      const ctx = thumbCanvas.getContext('2d');
      if (!ctx) return undefined;

      ctx.drawImage(canvas, 0, 0, thumbW, thumbH);
      return thumbCanvas.toDataURL('image/jpeg', 0.65);
    } catch {
      return undefined;
    }
  }
}
