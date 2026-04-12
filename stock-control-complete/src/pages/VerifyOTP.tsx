import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle, CheckCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { OTPInput } from '@/components/ui/OTPInput';

export default function VerifyOTP() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      toast.error('Email não encontrado. Por favor, tente novamente.');
      navigate('/login');
    }
  }, [navigate]);

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });

      if (error) throw error;

      if (data.user) {
        setIsVerified(true);
        toast.success('Conta verificada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError('Código OTP inválido ou expirado.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar OTP.');
      toast.error(err.message || 'Erro ao verificar OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      toast.success('Novo código OTP enviado para seu email!');
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar OTP.');
      toast.error(err.message || 'Erro ao reenviar OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <div className="p-8">
          <div className="text-center mb-8">
            <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: 'Poppins' }}>
              Verificar Conta
            </h1>
            <CardDescription className="text-muted-foreground">
              {isVerified ? (
                'Sua conta foi verificada com sucesso!'
              ) : (
                `Um código de 6 dígitos foi enviado para ${email}. Por favor, insira-o abaixo.`
              )}
            </CardDescription>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isVerified ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <Button onClick={() => navigate('/login')} className="w-full">
                Ir para o Login
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <OTPInput length={6} onComplete={setOtp} />
              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  'Verificar Código'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleResendOtp}
                disabled={loading}
                className="w-full text-blue-600 hover:text-blue-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  'Reenviar Código'
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
