import { useMutation } from '@tanstack/react-query';
import { sendCode, signIn } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import type { AuthTransaction } from '../domain/types';

export function useSendCode() {
  return useMutation({
    mutationFn: (phone: string) => sendCode(phone),
  });
}

export function useSignIn() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: ({
      transactionId,
      code,
      password,
    }: {
      transactionId: string;
      code: string;
      password?: string;
    }) => signIn(transactionId, code, password),
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
}

export type { AuthTransaction };
