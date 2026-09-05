import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'starfashion_wholesale_secret_key_change_in_production_2026';

export interface UserSessionPayload {
  userId: string;
  email: string;
  userType: 'ADMIN' | 'CUSTOMER';
  customerId?: string; // Present for customer users
  companyName?: string;
  role?: string;
}

export class AuthUtils {
  /**
   * Hashes plain text password using bcrypt.
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compares plain password against stored hash.
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Signs a JWT session token.
   */
  public static signToken(payload: UserSessionPayload, expiresIn: string = '24h'): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Verifies and decodes a JWT session token.
   */
  public static verifyToken(token: string): UserSessionPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as UserSessionPayload;
    } catch {
      return null;
    }
  }
}
