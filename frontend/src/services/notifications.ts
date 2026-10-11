/**
 * Browser Desktop & System Notifications for Baadh Bol:
 * Dispatches native browser alerts when critical disaster warnings are received.
 */

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public getPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser notifications not supported in this environment.');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  }

  public dispatchNotification(title: string, body: string, iconUrl?: string): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl || '/images/hero_aerial_river.jpg',
        badge: '/images/hero_aerial_river.jpg',
        tag: `baadhbol-${Date.now()}`,
        requireInteraction: true
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('Failed to dispatch desktop notification:', e);
      return false;
    }
  }
}

export const DesktopNotifications = new NotificationService();
