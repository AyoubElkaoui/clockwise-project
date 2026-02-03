'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Smartphone, Copy, Check, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type TwoFactorMethod = 'email' | 'totp';

interface TwoFactorSetupResponse {
  method: string;
  secret?: string;
  qrCodeDataUrl?: string;
  backupCodes?: string[];
}

export function TwoFactorSetup() {
  const [step, setStep] = useState<'choose' | 'setup' | 'verify'>('choose');
  const [method, setMethod] = useState<TwoFactorMethod | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleMethodSelect = async (selectedMethod: TwoFactorMethod) => {
    setMethod(selectedMethod);
    setLoading(true);
    setError('');

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/two-factor/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': userId || '',
        },
        body: JSON.stringify({ method: selectedMethod }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Setup failed');
      }

      const data: TwoFactorSetupResponse = await response.json();
      
      if (selectedMethod === 'totp') {
        setQrCodeUrl(data.qrCodeDataUrl || '');
        setSecret(data.secret || '');
      }
      
      setBackupCodes(data.backupCodes || []);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/two-factor/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': userId || '',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Invalid code');
      }

      const data = await response.json();
      
      if (data.success) {
        alert('2FA succesvol geactiveerd! 🎉');
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 1: Choose method
  if (step === 'choose') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Kies 2FA Methode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleMethodSelect('email')}
              disabled={loading}
              className="p-6 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left disabled:opacity-50"
            >
              <Mail className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">Email Verificatie</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ontvang een 6-cijferige code via email bij elke login.
              </p>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Makkelijk te gebruiken</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Geen app nodig</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect('totp')}
              disabled={loading}
              className="p-6 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left disabled:opacity-50"
            >
              <Smartphone className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">Authenticator App</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Gebruik Google Authenticator, Microsoft Authenticator of Authy.
              </p>
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Extra veilig</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Werkt offline</span>
                </div>
              </div>
            </button>
          </div>
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Step 2: Setup
  if (step === 'setup') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>
            {method === 'totp' ? 'Scan QR Code' : 'Email Verificatie Setup'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {method === 'totp' && (
            <>
              <div className="text-center">
                <p className="mb-4 text-slate-600 dark:text-slate-400">
                  Scan deze QR code met je authenticator app
                </p>
                <div className="inline-block p-4 bg-white rounded-lg">
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-64 h-64"
                    />
                  )}
                </div>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Of voer deze code handmatig in:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded border font-mono text-sm">
                    {secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(secret)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {method === 'email' && (
            <Alert>
              <Mail className="w-4 h-4" />
              <AlertDescription>
                Bij elke login ontvang je een 6-cijferige code op je email.
                Klik op &quot;Activeer&quot; om 2FA in te schakelen.
              </AlertDescription>
            </Alert>
          )}

          {/* Backup Codes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Backup Codes
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Sla deze codes veilig op. Gebruik ze als je toegang verliest tot je 2FA methode.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 px-3 py-2 rounded border">
                  {code}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
            >
              <Copy className="w-4 h-4 mr-2" />
              Kopieer Alle Codes
            </Button>
          </div>

          {/* Verification */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {method === 'totp' ? 'Voer verificatiecode in om te activeren' : 'Klik op activeer om 2FA in te schakelen'}
            </label>
            <div className="flex gap-2">
              {method === 'totp' ? (
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-wider"
                />
              ) : (
                <Input
                  type="text"
                  placeholder="Druk op activeer"
                  disabled
                  className="text-center"
                />
              )}
              <Button 
                onClick={handleVerify} 
                disabled={loading || (method === 'totp' && verificationCode.length !== 6)}
              >
                {loading ? 'Bezig...' : 'Activeer'}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
