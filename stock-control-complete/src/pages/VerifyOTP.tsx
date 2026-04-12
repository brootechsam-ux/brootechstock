import React, { useRef, useState, ChangeEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  length?: number;
  onComplete?: (otp: string) => void;
}

const OTPInput = React.forwardRef<HTMLInputElement, OTPInputProps>(
  ({ length = 6, onComplete, className, ...props }, ref) => {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
      const value = e.target.value;
      if (/[^0-9]/.test(value)) return; // Apenas números

      const newOtp = [...otp];
      newOtp[index] = value.slice(-1); // Pega apenas o último dígito
      setOtp(newOtp);

      // Mover para o próximo input se um dígito foi inserido
      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Chamar onComplete se todos os dígitos foram preenchidos
      if (newOtp.every(digit => digit !== '')) {
        onComplete?.(newOtp.join(''));
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        // Mover para o input anterior ao apagar
        inputRefs.current[index - 1]?.focus();
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasteData = e.clipboardData.getData('text/plain').slice(0, length);
      const newOtp = pasteData.split('').filter(char => /[0-9]/.test(char));

      if (newOtp.length === length) {
        setOtp(newOtp);
        onComplete?.(newOtp.join(''));
        inputRefs.current[length - 1]?.focus();
      } else if (newOtp.length > 0) {
        // Preencher o máximo possível e focar no próximo vazio
        const updatedOtp = [...otp];
        for (let i = 0; i < newOtp.length; i++) {
          updatedOtp[i] = newOtp[i];
        }
        setOtp(updatedOtp);
        inputRefs.current[newOtp.length - 1]?.focus();
      }
    };

    return (
      <div className="flex space-x-2 justify-center" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => (inputRefs.current[index] = el)}
            className={cn(
              'w-12 h-12 text-center text-2xl font-bold border border-input rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all',
              className
            )}
            {...props}
          />
        ))}
      </div>
    );
  }
);

OTPInput.displayName = 'OTPInput';

export { OTPInput };
