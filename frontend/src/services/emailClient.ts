import type { Order } from '../types/vphone';

export interface EmailSendResult {
  sent: boolean;
  configured?: boolean;
  sandboxRestricted?: boolean;
  error?: string;
}

async function postEmailApi(url: string, body: unknown): Promise<EmailSendResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as EmailSendResult;
    return data;
  } catch {
    return { sent: false, configured: false };
  }
}

export async function sendWelcomeEmail(payload: {
  email: string;
  hoTen: string;
  maKhach: string;
  loginMethod?: 'LOCAL' | 'GOOGLE';
  event?: 'REGISTER' | 'LOGIN';
  vaiTroLabel?: string;
}): Promise<EmailSendResult> {
  return postEmailApi('/api/send-welcome-email', payload);
}

export async function sendOrderConfirmationEmail(payload: {
  email: string;
  order: Order;
}): Promise<EmailSendResult> {
  return postEmailApi('/api/send-order-email', payload);
}
