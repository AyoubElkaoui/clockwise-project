'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Smartphone, Mail, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { API_URL } from '@/lib/api';

export default function AdminTwoFactorPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    enabled: boolean;
    method: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    fetchStatus();
    const required = localStorage.getItem('require2FASetup') === 'true';
    setIsRequired(required);
  }, []);

  const fetchStatus = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const medewGcId = localStorage.getItem('medewGcId');
      const response = await fetch(`${API_URL}/two-factor/status`, {
        headers: {
          'X-USER-ID': userId || '',
          'X-MEDEW-GC-ID': medewGcId || '',
          'ngrok-skip-browser-warning': '1',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorStatus(data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6 && !disableCode.includes('-')) {
      setError('Voer een geldige code in (6 cijfers of backup code)');
      return;
    }

    setDisabling(true);
    setError('');

    try {
      const userId = localStorage.getItem('userId');
      const medewGcId = localStorage.getItem('medewGcId');
      const response = await fetch(`${API_URL}/two-factor/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-ID': userId || '',
          'X-MEDEW-GC-ID': medewGcId || '',
          'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify({ code: disableCode }),
      });

      if (response.ok) {
        alert('2FA is uitgeschakeld!');
        setShowDisable(false);
        setDisableCode('');
        fetchStatus();
      } else {
        const data = await response.json();
        setError(data.message || 'Ongeldige code');
      }
    } catch (err) {
      setError('Er ging iets mis. Probeer opnieuw.');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => {
            setShowSetup(false);
            fetchStatus();
          }}
          className="mb-4"
        >
          ← Terug
        </Button>
        <TwoFactorSetup />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Tweestapsverificatie (2FA)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Extra beveiliging voor je admin account
          </p>
        </div>
      </div>

      {isRequired && !twoFactorStatus?.enabled && (
        <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-900 dark:text-orange-100">
            <strong>Actie vereist:</strong> Tweestapsverificatie is verplicht voor admin accounts.
            Stel 2FA in om toegang te krijgen tot de applicatie.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status</span>
            {twoFactorStatus?.enabled ? (
              <span className="flex items-center gap-2 text-green-600 text-base font-normal">
                <CheckCircle className="w-5 h-5" />
                Actief
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-500 text-base font-normal">
                <XCircle className="w-5 h-5" />
                Niet actief
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorStatus?.enabled ? (
            <>
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  Tweestapsverificatie is ingeschakeld met{' '}
                  <strong>
                    {twoFactorStatus.method === 'totp'
                      ? 'Authenticator App (Microsoft Authenticator)'
                      : 'Email'}
                  </strong>
                  . Je account is extra beveiligd.
                </AlertDescription>
              </Alert>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Actieve Methode</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {twoFactorStatus.method === 'totp'
                      ? 'Microsoft Authenticator / Google Authenticator'
                      : 'Email verificatie'}
                  </p>
                </div>
              </div>

              {showDisable ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-100">
                        2FA Uitschakelen
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Voer je huidige authenticator code of een backup code in om 2FA uit te schakelen.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="000000 of backup code"
                      value={disableCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisableCode(e.target.value)}
                      className="text-center text-lg tracking-wider"
                    />
                    <Button
                      variant="destructive"
                      onClick={handleDisable}
                      disabled={disabling}
                    >
                      {disabling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uitschakelen'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDisable(false);
                        setDisableCode('');
                        setError('');
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    Wil je 2FA uitschakelen?
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    Als je 2FA uitschakelt, is je account minder veilig.
                  </p>
                  <Button
                    variant="outline"
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                    onClick={() => setShowDisable(true)}
                  >
                    2FA Uitschakelen
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Tweestapsverificatie voegt een extra beveiligingslaag toe aan je account.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Smartphone className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-semibold mb-1">Authenticator App</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gebruik Microsoft Authenticator, Google Authenticator of Authy.
                  </p>
                  <p className="text-xs text-green-600 mt-2 font-medium">Aanbevolen</p>
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg opacity-50">
                  <Mail className="w-8 h-8 text-gray-400 mb-2" />
                  <h3 className="font-semibold mb-1 text-gray-500">Email Verificatie</h3>
                  <p className="text-sm text-gray-400">
                    Binnenkort beschikbaar
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setShowSetup(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Shield className="w-5 h-5 mr-2" />
                2FA Inschakelen met Authenticator App
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
