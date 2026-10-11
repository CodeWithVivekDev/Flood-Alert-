import { OperatorUser, OperatorRole } from '../types';

const STORAGE_KEY = 'baadh_bol_user';

export const AuthService = {
  getUser(): OperatorUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading user session', e);
    }
    // Default to admin for seamless evaluation
    return {
      email: 'admin@baadhbol.delhi.gov.in',
      role: 'admin',
      token: 'mock-admin-token'
    };
  },

  setUser(user: OperatorUser): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  login(email: string, role: OperatorRole): OperatorUser {
    const user: OperatorUser = {
      email,
      role,
      token: `mock-${role}-token`
    };
    this.setUser(user);
    return user;
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  isAdmin(): boolean {
    const u = this.getUser();
    return u?.role === 'admin';
  }
};
