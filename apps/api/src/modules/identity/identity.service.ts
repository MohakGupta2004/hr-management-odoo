import crypto from "crypto";

export class IdentityService {
  // Generates a strong 12-char temporary password.
  generateTemporaryPassword(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    // Ensure at least one of each required character type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[crypto.randomInt(0, 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[crypto.randomInt(0, 26)];
    password += "0123456789"[crypto.randomInt(0, 10)];
    password += "!@#$%^&*()"[crypto.randomInt(0, 10)];
    
    // Fill the rest to reach 12 characters
    for (let i = 0; i < 8; i++) {
      password += chars[crypto.randomInt(0, chars.length)];
    }
    
    // Shuffle the password string
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  // Builds the login ID, e.g. TNJODO20260001.
  generateLoginId(prefix: string, firstName: string, lastName: string, year: number, serial: number): string {
    const fnPart = firstName.substring(0, 2).toUpperCase().padEnd(2, "X");
    const lnPart = lastName ? lastName.substring(0, 2).toUpperCase().padEnd(2, "X") : "XX";
    const serialStr = String(serial).padStart(4, "0");
    return `${prefix}${fnPart}${lnPart}${year}${serialStr}`;
  }

  // Next joining serial for the year, read inside a tx to avoid races.
  async getNextJoiningSerial(tx: any, companyId: string, year: number): Promise<number> {
    const lastEmployee = await tx.employee.findFirst({
      where: {
        companyId,
        joiningYear: year,
      },
      orderBy: {
        joiningSerial: "desc",
      },
    });

    return lastEmployee ? lastEmployee.joiningSerial + 1 : 1;
  }
}
