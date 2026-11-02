import { supabase } from "../components/supabaseClient";

interface MFASession {
  email: string;
  code: string;
  expiresAt: number;
}

const MFA_CODE_EXPIRY = 10 * 60 * 1000;

class MFAService {
  private sessions: Map<string, MFASession> = new Map();

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendMFACode(email: string): Promise<boolean> {
    try {
      const code = this.generateCode();
      const expiresAt = Date.now() + MFA_CODE_EXPIRY;

      this.sessions.set(email, { email, code, expiresAt });

      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          data: {
            verification_code: code
          }
        }
      });

      if (error) {
        console.error('Error sending MFA code:', error);
        return false;
      }

      console.log(`MFA Code for ${email}: ${code}`);
      return true;
    } catch (error) {
      console.error('Failed to send MFA code:', error);
      return false;
    }
  }

  verifyMFACode(email: string, code: string): boolean {
    const session = this.sessions.get(email);

    if (!session) {
      return false;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(email);
      return false;
    }

    if (session.code !== code) {
      return false;
    }

    this.sessions.delete(email);
    return true;
  }

  clearSession(email: string): void {
    this.sessions.delete(email);
  }
}

export const mfaService = new MFAService();
