export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validateLoginInput(email: string, password: string): string | null {
    if (!email || !validateEmail(email)) {
        return 'Invalid email format';
    }
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return null;
}


