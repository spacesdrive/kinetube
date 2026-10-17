import Notice from '@/components/patterns/Notice';

export interface FormErrorProps {
  message: string;
}

export default function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return <Notice tone="error" className="break-words">{message}</Notice>;
}
